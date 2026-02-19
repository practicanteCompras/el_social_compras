"""Inventory service — products, stock, movements, price history, supplier links."""

from typing import Optional, List, Any
from app.db.client import get_supabase_admin


def get_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
) -> List[dict[str, Any]]:
    """Select from products left-joining inventory_stock to include current_quantity.
    Apply ilike on name/code if search provided, exact match on category.
    """
    client = get_supabase_admin()
    query = client.table("products").select("*, inventory_stock(current_quantity)")

    if search:
        query = query.or_(f"name.ilike.%{search}%,code.ilike.%{search}%")
    if category:
        query = query.eq("category", category)

    response = query.execute()
    rows = response.data or []

    # Flatten inventory_stock if it comes as a list (one-to-one)
    for row in rows:
        inv = row.get("inventory_stock")
        if isinstance(inv, list) and inv:
            row["current_quantity"] = inv[0].get("current_quantity", 0)
        elif isinstance(inv, dict):
            row["current_quantity"] = inv.get("current_quantity", 0)
        else:
            row["current_quantity"] = 0
        if "inventory_stock" in row:
            del row["inventory_stock"]

    return rows


def get_product(product_id: int) -> dict[str, Any]:
    """Get single product with current_quantity from inventory_stock."""
    client = get_supabase_admin()
    response = (
        client.table("products")
        .select("*, inventory_stock(current_quantity)")
        .eq("id", product_id)
        .execute()
    )

    if not response.data or len(response.data) == 0:
        raise ValueError(f"Product with id {product_id} not found")

    row = response.data[0]
    inv = row.get("inventory_stock")
    if isinstance(inv, list) and inv:
        row["current_quantity"] = inv[0].get("current_quantity", 0)
    elif isinstance(inv, dict):
        row["current_quantity"] = inv.get("current_quantity", 0)
    else:
        row["current_quantity"] = 0
    if "inventory_stock" in row:
        del row["inventory_stock"]

    return row


def create_product(data: dict[str, Any]) -> dict[str, Any]:
    """Insert into products, also create inventory_stock row with quantity 0. Return product."""
    client = get_supabase_admin()
    product_data = {k: v for k, v in data.items() if k != "current_quantity"}
    response = client.table("products").insert(product_data).execute()

    if not response.data or len(response.data) == 0:
        raise ValueError("Failed to create product")

    product = response.data[0]
    product_id = product["id"]
    client.table("inventory_stock").insert(
        {"product_id": product_id, "current_quantity": 0}
    ).execute()

    product["current_quantity"] = 0
    return product


def update_product(product_id: int, data: dict[str, Any]) -> dict[str, Any]:
    """Update product fields."""
    client = get_supabase_admin()
    filtered = {k: v for k, v in data.items() if v is not None and k != "current_quantity"}

    if not filtered:
        return get_product(product_id)

    response = client.table("products").update(filtered).eq("id", product_id).execute()

    if not response.data or len(response.data) == 0:
        raise ValueError(f"Product with id {product_id} not found")

    return get_product(product_id)


def delete_product(product_id: int) -> None:
    """Delete product and related records."""
    client = get_supabase_admin()
    # Delete related records first (order of FK dependencies)
    client.table("order_items").delete().eq("product_id", product_id).execute()
    client.table("inventory_movements").delete().eq("product_id", product_id).execute()
    client.table("price_history").delete().eq("product_id", product_id).execute()
    client.table("product_suppliers").delete().eq("product_id", product_id).execute()
    client.table("inventory_stock").delete().eq("product_id", product_id).execute()
    client.table("products").delete().eq("id", product_id).execute()


def link_supplier(product_id: int, supplier_id: int, slot: int) -> dict[str, Any]:
    """Upsert into product_suppliers table."""
    client = get_supabase_admin()
    data = {"product_id": product_id, "supplier_id": supplier_id, "slot": slot}
    response = (
        client.table("product_suppliers")
        .upsert(data, on_conflict="product_id,slot")
        .execute()
    )
    if not response.data or len(response.data) == 0:
        raise ValueError("Failed to link supplier")
    return response.data[0]


def unlink_supplier(product_id: int, slot: int) -> None:
    """Delete from product_suppliers by product_id and slot."""
    client = get_supabase_admin()
    client.table("product_suppliers").delete().eq("product_id", product_id).eq(
        "slot", slot
    ).execute()


def add_price(
    product_id: int,
    supplier_id: int,
    price: float,
    recorded_month: int,
    recorded_year: int,
) -> dict[str, Any]:
    """Insert into price_history (append-only)."""
    client = get_supabase_admin()
    data = {
        "product_id": product_id,
        "supplier_id": supplier_id,
        "price": price,
        "recorded_month": recorded_month,
        "recorded_year": recorded_year,
    }
    response = client.table("price_history").insert(data).execute()
    if not response.data or len(response.data) == 0:
        raise ValueError("Failed to add price")
    return response.data[0]


def get_price_history(product_id: int, months: int = 12) -> List[dict[str, Any]]:
    """Select from price_history for product, ordered by year desc, month desc, limited."""
    client = get_supabase_admin()
    response = (
        client.table("price_history")
        .select("*")
        .eq("product_id", product_id)
        .order("recorded_year", desc=True)
        .order("recorded_month", desc=True)
        .limit(months)
        .execute()
    )
    return response.data or []


def get_price_comparison(product_id: int) -> List[dict[str, Any]]:
    """For each linked supplier, get latest price from price_history, compute variation vs previous month,
    flag the lowest as is_best_price. Return list of dicts.
    """
    client = get_supabase_admin()
    links = (
        client.table("product_suppliers")
        .select("supplier_id, slot")
        .eq("product_id", product_id)
        .execute()
    ).data or []

    if not links:
        return []

    results = []

    for link in links:
        sid = link["supplier_id"]
        slot = link["slot"]
        hist = (
            client.table("price_history")
            .select("price, recorded_month, recorded_year")
            .eq("product_id", product_id)
            .eq("supplier_id", sid)
            .order("recorded_year", desc=True)
            .order("recorded_month", desc=True)
            .limit(2)
            .execute()
        ).data or []

        current_price = hist[0]["price"] if hist else None
        previous_price = hist[1]["price"] if len(hist) > 1 else None

        supplier = (
            client.table("suppliers").select("company_name").eq("id", sid).execute()
        ).data
        supplier_name = supplier[0]["company_name"] if supplier else ""

        variation_pct = None
        if current_price is not None and previous_price is not None and previous_price > 0:
            variation_pct = ((current_price - previous_price) / previous_price) * 100

        results.append(
            {
                "supplier_id": sid,
                "supplier_name": supplier_name,
                "slot": slot,
                "current_price": current_price,
                "previous_price": previous_price,
                "variation_pct": variation_pct,
                "is_best_price": False,
            }
        )

    # Find min current price and set is_best_price
    valid = [r for r in results if r["current_price"] is not None]
    if valid:
        min_price = min(r["current_price"] for r in valid)
        for r in results:
            r["is_best_price"] = r["current_price"] == min_price

    return results


def create_movement(data: dict[str, Any], user_id: str) -> dict[str, Any]:
    """Insert into inventory_movements, then update inventory_stock.
    Increase for purchase_entry/adjustment, decrease for exit_by_request/loss_damage.
    If decrease would make stock negative, raise ValueError.
    """
    client = get_supabase_admin()
    movement_type = data.get("movement_type")
    quantity = data.get("quantity", 0)
    product_id = data.get("product_id")

    if quantity <= 0:
        raise ValueError("Quantity must be positive")

    stock_resp = (
        client.table("inventory_stock")
        .select("current_quantity")
        .eq("product_id", product_id)
        .execute()
    )
    current = 0
    if stock_resp.data and len(stock_resp.data) > 0:
        current = stock_resp.data[0].get("current_quantity", 0)

    if movement_type in ("exit_by_request", "loss_damage"):
        if current < quantity:
            raise ValueError(
                f"Insufficient stock: current={current}, requested decrease={quantity}"
            )
        new_qty = current - quantity
    else:
        new_qty = current + quantity

    movement_data = {
        "product_id": product_id,
        "movement_type": movement_type,
        "quantity": quantity,
        "user_id": user_id,
        "sede_id": data.get("sede_id"),
        "notes": data.get("notes"),
    }
    mov_resp = client.table("inventory_movements").insert(movement_data).execute()
    if not mov_resp.data or len(mov_resp.data) == 0:
        raise ValueError("Failed to create movement")

    client.table("inventory_stock").update({"current_quantity": new_qty}).eq(
        "product_id", product_id
    ).execute()

    return mov_resp.data[0]


def get_movements(
    product_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[dict[str, Any]]:
    """Select from inventory_movements with optional filters."""
    client = get_supabase_admin()
    query = client.table("inventory_movements").select("*")

    if product_id is not None:
        query = query.eq("product_id", product_id)
    if movement_type:
        query = query.eq("movement_type", movement_type)
    if date_from:
        query = query.gte("created_at", date_from)
    if date_to:
        query = query.lte("created_at", date_to)

    response = query.order("created_at", desc=True).execute()
    return response.data or []


def get_low_stock_alerts() -> List[dict[str, Any]]:
    """Select products where inventory_stock.current_quantity < products.min_stock.
    Return list with product info and deficit.
    """
    client = get_supabase_admin()
    response = (
        client.table("products")
        .select("id, name, code, min_stock, inventory_stock(current_quantity)")
        .execute()
    )

    alerts = []
    for row in response.data or []:
        inv = row.get("inventory_stock")
        current = 0
        if isinstance(inv, list) and inv:
            current = inv[0].get("current_quantity", 0)
        elif isinstance(inv, dict):
            current = inv.get("current_quantity", 0)

        min_stock = row.get("min_stock", 0)
        if current < min_stock:
            alerts.append(
                {
                    "product_id": row["id"],
                    "product_name": row["name"],
                    "product_code": row["code"],
                    "current_quantity": current,
                    "min_stock": min_stock,
                    "deficit": min_stock - current,
                }
            )

    return alerts
