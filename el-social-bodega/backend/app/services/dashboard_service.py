"""Dashboard service — stock summary, movement history, price trends, savings history."""

from typing import List, Any
from datetime import datetime, timedelta
from app.db.client import get_supabase_admin

from app.services.suggestion_service import compute_order_savings


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


def get_savings_history() -> List[dict[str, Any]]:
    """Compute savings from approved/dispatched/delivered orders."""
    client = get_supabase_admin()
    response = (
        client.table("orders")
        .select("id, status, created_at, order_items(*)")
        .in_("status", ["approved", "dispatched", "delivered"])
        .order("created_at", desc=True)
        .execute()
    )

    history = []
    for order in response.data or []:
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

        savings = compute_order_savings(order_items)
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
