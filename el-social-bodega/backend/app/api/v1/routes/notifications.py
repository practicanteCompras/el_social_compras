"""
Notifications API routes.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_any_role
import app.services.notification_service as notification_service

router = APIRouter()


@router.get("/")
async def list_notifications(
    current_user: dict = Depends(require_any_role),
):
    try:
        data = notification_service.get_notifications(user_id=current_user["id"])
        return data
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(require_any_role),
):
    try:
        notification_service.mark_as_read(notification_id)
        return {"message": "Notification marked as read"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
