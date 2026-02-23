"""Dashboard service — stock summary, movement history, price trends, savings history."""

from typing import List, Any, Optional
from datetime import datetime, timedelta
from app.db.client import get_supabase_admin


def get_stock_summary() -> List[dict[str, Any]]:
    """Aggregate inventory_stock by product category, return category, total_quantity, product_count."""
    client = get_supabase_admin()
    response = (
        client.table("products")
        .select("category, inventory_stock(current_quantity)")
        .execute()
    )

    by_category: dict[str, dict[str, Any]] = {}

    for row in response.data or []:
        cat = row.get("category", "unknown")
        inv = row.get("inventory_stock")
        qty = 0
        if isinstance(inv, list) and inv:
            qty = inv[0].get("current_quantity", 0)
        elif isinstance(inv, dict):
            qty = inv.get("current_quantity", 0)

        if cat not in by_category:
            by_category[cat] = {"category": cat, "total_quantity": 0, "product_count": 0}
        by_category[cat]["total_quantity"] += qty
        by_category[cat]["product_count"] += 1

    return list(by_category.values())


def get_movement_history(period_months: int = 6) -> List[dict[str, Any]]:
    """Group inventory_movements by month and type (entries vs exits), return time series data."""
    client = get_supabase_admin()
    cutoff = datetime.utcnow() - timedelta(days=period_months * 31)
    cutoff_str = cutoff.isoformat()

    response = (
        client.table("inventory_movements")
        .select("movement_type, quantity, created_at")
        .gte("created_at", cutoff_str)
        .execute()
    )

    by_month: dict[str, dict[str, Any]] = {}
    entry_types = {"purchase_entry", "adjustment"}
    exit_types = {"exit_by_request", "loss_damage"}

    for row in response.data or []:
        created = row.get("created_at")
        if not created:
            continue
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            key = f"{dt.year}-{dt.month:02d}"
        except (ValueError, TypeError):
            continue

        if key not in by_month:
            by_month[key] = {"month": key, "entries": 0, "exits": 0}

        qty = row.get("quantity", 0)
        mt = row.get("movement_type", "")
        if mt in entry_types:
            by_month[key]["entries"] += qty
        elif mt in exit_types:
            by_month[key]["exits"] += qty

    return sorted(by_month.values(), key=lambda x: x["month"])


def get_price_trends(product_id: int, months: int = 12) -> List[dict[str, Any]]:
    """Get price_history for a product grouped by supplier, return time series."""
    client = get_supabase_admin()
    response = (
        client.table("price_history")
        .select("*, suppliers(company_name)")
        .eq("product_id", product_id)
        .order("recorded_year", desc=True)
        .order("recorded_month", desc=True)
        .limit(months * 5)
        .execute()
    )

    by_supplier: dict[int, dict[str, Any]] = {}
    for row in response.data or []:
        sid = row.get("supplier_id")
        supp = row.get("suppliers")
        name = ""
        if isinstance(supp, dict):
            name = supp.get("company_name", "")
        elif isinstance(supp, list) and supp:
            name = supp[0].get("company_name", "") if supp[0] else ""

        if sid not in by_supplier:
            by_supplier[sid] = {"supplier_id": sid, "supplier_name": name, "prices": []}

        by_supplier[sid]["prices"].append(
            {
                "year": row["recorded_year"],
                "month": row["recorded_month"],
                "price": row["price"],
            }
        )

    return list(by_supplier.values())


def _build_best_supplier_cache_batch(product_ids: set[int]) -> dict[int, Optional[dict[str, Any]]]:
    """Build product_id -> best supplier (supplier_id, supplier_name, price, highest_price) with batched queries.
    Uses 3 Supabase round-trips regardless of number of products.
    """
    if not product_ids:
        return {}
    client = get_supabase_admin()
    pid_list = list(product_ids)

    # 1. All product_suppliers links for these products
    links_resp = (
        client.table("product_suppliers")
        .select("product_id, supplier_id")
        .in_("product_id", pid_list)
        .execute()
    )
    links = [(r["product_id"], r["supplier_id"]) for r in (links_resp.data or [])]
    if not links:
        return {pid: None for pid in product_ids}

    supplier_ids = list({sid for _, sid in links})

    # 2. Latest price per (product_id, supplier_id): fetch all price_history for these products, ordered desc
    ph_resp = (
        client.table("price_history")
        .select("product_id, supplier_id, price, recorded_year, recorded_month")
        .in_("product_id", pid_list)
        .order("recorded_year", desc=True)
        .order("recorded_month", desc=True)
        .execute()
    )
    latest_price: dict[tuple[int, int], float] = {}
    for row in ph_resp.data or []:
        key = (row["product_id"], row["supplier_id"])
        if key not in latest_price:
            latest_price[key] = row["price"]

    # 3. Supplier names
    supp_resp = (
        client.table("suppliers")
        .select("id, company_name")
        .in_("id", supplier_ids)
        .execute()
    )
    supplier_names = {r["id"]: r.get("company_name") or "" for r in (supp_resp.data or [])}

    # Build per-product list of (supplier_id, supplier_name, price)
    product_candidates: dict[int, list[dict[str, Any]]] = {pid: [] for pid in product_ids}
    for (pid, sid) in links:
        price = latest_price.get((pid, sid))
        if price is None:
            continue
        product_candidates[pid].append({
            "supplier_id": sid,
            "supplier_name": supplier_names.get(sid, ""),
            "price": price,
        })

    best_cache: dict[int, Optional[dict[str, Any]]] = {}
    for pid in product_ids:
        candidates = product_candidates.get(pid) or []
        if not candidates:
            best_cache[pid] = None
            continue
        highest_price = max(c["price"] for c in candidates)
        best = min(candidates, key=lambda x: x["price"])
        best["highest_price"] = highest_price
        best_cache[pid] = best

    return best_cache


def get_savings_history() -> List[dict[str, Any]]:
    """Compute savings from approved/dispatched/delivered orders.
    Builds a product→best_price cache with batched Supabase queries (3 round-trips total).
    """
    client = get_supabase_admin()
    response = (
        client.table("orders")
        .select("id, status, created_at, order_items(*)")
        .in_("status", ["approved", "dispatched", "delivered"])
        .order("created_at", desc=True)
        .execute()
    )

    # Collect all distinct product IDs across all orders first
    all_product_ids: set[int] = set()
    orders_data = response.data or []
    for order in orders_data:
        items = order.get("order_items", [])
        if isinstance(items, dict):
            items = [items]
        for it in items:
            pid = it.get("product_id")
            if pid is not None:
                all_product_ids.add(pid)

    best_cache = _build_best_supplier_cache_batch(all_product_ids)

    history = []
    for order in orders_data:
        items = order.get("order_items", [])
        if isinstance(items, dict):
            items = [items]
        order_items = [
            {
                "product_id": it.get("product_id"),
                "quantity_requested": it.get("quantity_requested", 0),
            }
            for it in items
        ]

        # compute_order_savings_from_cache avoids repeated lookups
        savings = _compute_savings_from_cache(order_items, best_cache)
        history.append(
            {
                "order_id": order["id"],
                "status": order["status"],
                "created_at": order.get("created_at"),
                "total_savings": savings["total_savings"],
                "per_item": savings["per_item"],
            }
        )

    return history


def _compute_savings_from_cache(
    order_items: List[dict[str, Any]],
    best_cache: dict[int, Any],
) -> dict[str, Any]:
    """Compute savings for a list of order items using a pre-built best_cache dict
    (product_id → best supplier data) to avoid redundant DB calls.
    """
    per_item = []
    total_savings = 0.0

    for item in order_items:
        product_id = item.get("product_id")
        quantity = item.get("quantity_requested", item.get("quantity", 0))
        best = best_cache.get(product_id) if product_id is not None else None

        if not best:
            per_item.append(
                {
                    "product_id": product_id,
                    "suggested_supplier_id": None,
                    "suggested_price": None,
                    "highest_price": None,
                    "savings": 0.0,
                }
            )
            continue

        highest = best.get("highest_price") or best["price"]
        lowest = best["price"]
        savings = (highest - lowest) * quantity
        total_savings += savings

        per_item.append(
            {
                "product_id": product_id,
                "suggested_supplier_id": best["supplier_id"],
                "suggested_supplier_name": best["supplier_name"],
                "suggested_price": best["price"],
                "highest_price": highest,
                "savings": savings,
            }
        )

    return {"per_item": per_item, "total_savings": total_savings}
