"""Import service — CSV/Excel import for suppliers and products."""

import io
from typing import Any
from app.db.client import get_supabase_admin
import pandas as pd


REQUIRED_SUPPLIER_COLUMNS = {"nit", "company_name", "category", "contact_phone_1"}
REQUIRED_PRODUCT_COLUMNS = {"code", "name", "category", "unit"}


def _parse_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Parse CSV or XLSX using pandas."""
    ext = filename.lower().split(".")[-1] if filename else ""
    if ext in ("xlsx", "xls"):
        return pd.read_excel(io.BytesIO(file_bytes))
    return pd.read_csv(io.BytesIO(file_bytes))


def import_suppliers(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """Parse CSV or XLSX, validate required columns (nit, company_name, category, contact_phone_1),
    upsert into suppliers table. Return dict with imported_count, skipped rows with reasons.
    """
    df = _parse_file(file_bytes, filename)
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    missing = REQUIRED_SUPPLIER_COLUMNS - set(df.columns)
    if missing:
        return {
            "imported_count": 0,
            "skipped": [],
            "error": f"Missing required columns: {', '.join(missing)}",
        }

    client = get_supabase_admin()
    imported = 0
    skipped = []

    for idx, row in df.iterrows():
        try:
            nit = str(row.get("nit", "")).strip()
            company_name = str(row.get("company_name", "")).strip()
            category = str(row.get("category", "")).strip()
            contact_phone_1 = str(row.get("contact_phone_1", "")).strip()

            if not nit or not company_name or not category or not contact_phone_1:
                skipped.append({"row": int(idx) + 2, "reason": "Missing required field"})
                continue

            data = {
                "nit": nit,
                "company_name": company_name,
                "category": category,
                "contact_phone_1": contact_phone_1,
                "advisor_name": str(row.get("advisor_name", "")).strip() or None,
                "contact_phone_2": str(row.get("contact_phone_2", "")).strip() or None,
                "email": str(row.get("email", "")).strip() or None,
                "response_days": pd.to_numeric(row.get("response_days"), errors="coerce"),
                "credit_days": pd.to_numeric(row.get("credit_days"), errors="coerce"),
            }
            data = {
                k: v for k, v in data.items()
                if (v is not None or k in REQUIRED_SUPPLIER_COLUMNS)
                and not (isinstance(v, float) and pd.isna(v))
            }

            client.table("suppliers").upsert(data, on_conflict="nit").execute()
            imported += 1

        except Exception as e:
            skipped.append({"row": int(idx) + 2, "reason": str(e)})

    return {"imported_count": imported, "skipped": skipped}


def import_products(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """Parse CSV or XLSX, validate required columns (code, name, category, unit),
    insert into products + inventory_stock. Return dict with imported_count, skipped rows with reasons.
    """
    df = _parse_file(file_bytes, filename)
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    missing = REQUIRED_PRODUCT_COLUMNS - set(df.columns)
    if missing:
        return {
            "imported_count": 0,
            "skipped": [],
            "error": f"Missing required columns: {', '.join(missing)}",
        }

    client = get_supabase_admin()
    imported = 0
    skipped = []

    for idx, row in df.iterrows():
        try:
            code = str(row.get("code", "")).strip()
            name = str(row.get("name", "")).strip()
            category = str(row.get("category", "")).strip()
            unit = str(row.get("unit", "")).strip()

            if not code or not name or not category or not unit:
                skipped.append({"row": int(idx) + 2, "reason": "Missing required field"})
                continue

            min_stock = pd.to_numeric(row.get("min_stock", 0), errors="coerce")
            min_stock = int(min_stock) if pd.notna(min_stock) else 0

            product_data = {
                "code": code,
                "name": name,
                "category": category,
                "unit": unit,
                "min_stock": max(0, min_stock),
            }

            prod_resp = client.table("products").insert(product_data).execute()
            if not prod_resp.data or len(prod_resp.data) == 0:
                skipped.append({"row": int(idx) + 2, "reason": "Insert failed (duplicate code?)"})
                continue

            product_id = prod_resp.data[0]["id"]
            client.table("inventory_stock").insert(
                {"product_id": product_id, "current_quantity": 0}
            ).execute()
            imported += 1

        except Exception as e:
            skipped.append({"row": int(idx) + 2, "reason": str(e)})

    return {"imported_count": imported, "skipped": skipped}
