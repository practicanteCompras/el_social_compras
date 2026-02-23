"""
Suppliers API routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_user, require_admin, require_any_role
from app.models.suppliers import SupplierCreate, SupplierUpdate, SupplierResponse
import app.services.supplier_service as supplier_service

router = APIRouter()


@router.get("/", response_model=list[SupplierResponse])
async def list_suppliers(
    search: str | None = Query(None),
    category: str | None = Query(None),
    current_user: dict = Depends(require_any_role),
):
    """List suppliers with optional search and category filters."""
    try:
        data = supplier_service.get_suppliers(search=search, category=category)
        return [SupplierResponse(**item) for item in data]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/categories")
async def list_supplier_categories(current_user: dict = Depends(require_any_role)):
    """Return distinct supplier category names for dropdown/autocomplete."""
    return supplier_service.get_supplier_categories()


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: int,
    current_user: dict = Depends(require_any_role),
):
    """Get a single supplier by ID."""
    try:
        data = supplier_service.get_supplier(supplier_id)
        return SupplierResponse(**data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/", response_model=SupplierResponse)
async def create_supplier(
    body: SupplierCreate,
    current_user: dict = Depends(require_admin),
):
    """Create a new supplier."""
    try:
        data = supplier_service.create_supplier(body.model_dump())
        return SupplierResponse(**data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    body: SupplierUpdate,
    current_user: dict = Depends(require_admin),
):
    """Update an existing supplier."""
    try:
        data = supplier_service.update_supplier(supplier_id, body.model_dump(exclude_unset=True))
        return SupplierResponse(**data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: int,
    current_user: dict = Depends(require_admin),
):
    """Delete a supplier."""
    try:
        supplier_service.delete_supplier(supplier_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
