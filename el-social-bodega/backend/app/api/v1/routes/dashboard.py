"""
Dashboard API routes — stock summary, movement history, price trends, savings.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_any_role
import app.services.dashboard_service as dashboard_service

router = APIRouter()


@router.get("/stock-summary")
async def get_stock_summary(
    current_user: dict = Depends(require_any_role),
):
    """Get stock summary for dashboard."""
    try:
        data = dashboard_service.get_stock_summary()
        return data
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/movement-history")
async def get_movement_history(
    period_months: int = Query(6, ge=1, le=60),
    current_user: dict = Depends(require_any_role),
):
    """Get movement history for dashboard."""
    try:
        data = dashboard_service.get_movement_history(period_months=period_months)
        return data
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/price-trends")
async def get_price_trends(
    product_id: int = Query(..., description="Required product ID"),
    months: int = Query(12, ge=1, le=60),
    current_user: dict = Depends(require_any_role),
):
    """Get price trends for a product."""
    try:
        data = dashboard_service.get_price_trends(product_id=product_id, months=months)
        return data
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/savings-history")
async def get_savings_history(
    current_user: dict = Depends(require_any_role),
):
    """Get savings report history."""
    try:
        data = dashboard_service.get_savings_history()
        return data
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
