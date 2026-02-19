"""Suggestion service — best supplier and savings computation."""

from typing import Optional, List, Any
from app.db.client import get_supabase_admin


def get_best_supplier_for_product(product_id: int) -> Optional[dict[str, Any]]:
    """Look up product_suppliers, for each linked supplier get latest price from price_history,
    return the one with lowest price. Return dict with supplier_id, supplier_name, price, highest_price.
    """
    client = get_supabase_admin()
    links = (
        client.table("product_suppliers")
        .select("supplier_id")
        .eq("product_id", product_id)
        .execute()
    ).data or []

    if not links:
        return None

    candidates = []
    for link in links:
        sid = link["supplier_id"]
        hist = (
            client.table("price_history")
            .select("price")
            .eq("product_id", product_id)
            .eq("supplier_id", sid)
            .order("recorded_year", desc=True)
            .order("recorded_month", desc=True)
            .limit(1)
            .execute()
        ).data

        if not hist:
            continue

        price = hist[0]["price"]
        supplier = (
            client.table("suppliers")
            .select("company_name")
            .eq("id", sid)
            .execute()
        ).data
        supplier_name = supplier[0]["company_name"] if supplier else ""
        candidates.append({"supplier_id": sid, "supplier_name": supplier_name, "price": price})

    if not candidates:
        return None

    highest_price = max(c["price"] for c in candidates)
    best = min(candidates, key=lambda x: x["price"])
    best["highest_price"] = highest_price
    return best


def compute_order_savings(order_items: List[dict[str, Any]]) -> dict[str, Any]:
    """For each item, get best supplier, compute savings (highest - lowest) * quantity.
    Return per-item savings and total.
    """
    client = get_supabase_admin()
    per_item = []
    total_savings = 0.0

    for item in order_items:
        product_id = item.get("product_id")
        quantity = item.get("quantity_requested", item.get("quantity", 0))

        best = get_best_supplier_for_product(product_id)
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
