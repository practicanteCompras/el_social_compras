"""
Data import API routes — CSV/Excel upload for suppliers and products.
"""

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status

from app.core.security import require_admin
import app.services.import_service as import_service

router = APIRouter()


@router.post("/suppliers")
async def import_suppliers(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
):
    """Import suppliers from uploaded file (CSV or Excel)."""
    try:
        content = await file.read()
        result = import_service.import_suppliers(content, file.filename or "upload")
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/products")
async def import_products(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
):
    """Import products from uploaded file (CSV or Excel)."""
    try:
        content = await file.read()
        result = import_service.import_products(content, file.filename or "upload")
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
