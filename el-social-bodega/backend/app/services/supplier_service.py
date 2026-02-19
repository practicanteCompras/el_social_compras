"""Supplier service — CRUD operations for suppliers table."""

from typing import Optional, List, Any
from app.db.client import get_supabase_admin


def get_suppliers(
    search: Optional[str] = None,
    category: Optional[str] = None,
) -> List[dict[str, Any]]:
    """Select all from suppliers table with optional ilike filters on company_name and exact match on category."""
    client = get_supabase_admin()
    query = client.table("suppliers").select("*")

    if search:
        query = query.ilike("company_name", f"%{search}%")
    if category:
        query = query.eq("category", category)

    response = query.execute()
    return response.data or []


def get_supplier(supplier_id: int) -> dict[str, Any]:
    """Select supplier by id. Raise ValueError if not found."""
    client = get_supabase_admin()
    response = client.table("suppliers").select("*").eq("id", supplier_id).execute()

    if not response.data or len(response.data) == 0:
        raise ValueError(f"Supplier with id {supplier_id} not found")

    return response.data[0]


def create_supplier(data: dict[str, Any]) -> dict[str, Any]:
    """Insert into suppliers, return created record."""
    client = get_supabase_admin()
    response = client.table("suppliers").insert(data).execute()

    if not response.data or len(response.data) == 0:
        raise ValueError("Failed to create supplier")

    return response.data[0]


def update_supplier(supplier_id: int, data: dict[str, Any]) -> dict[str, Any]:
    """Update supplier by id with non-None fields, return updated record."""
    client = get_supabase_admin()
    filtered = {k: v for k, v in data.items() if v is not None}

    if not filtered:
        return get_supplier(supplier_id)

    response = client.table("suppliers").update(filtered).eq("id", supplier_id).execute()

    if not response.data or len(response.data) == 0:
        raise ValueError(f"Supplier with id {supplier_id} not found")

    return response.data[0]


def delete_supplier(supplier_id: int) -> None:
    """Delete supplier by id."""
    client = get_supabase_admin()
    response = client.table("suppliers").delete().eq("id", supplier_id).execute()

    if response.data is None and response.count == 0:
        raise ValueError(f"Supplier with id {supplier_id} not found")
