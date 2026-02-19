from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
    low_stock = "low_stock"
    new_order = "new_order"
    price_spike = "price_spike"


class NotificationResponse(BaseModel):
    id: int
    user_id: str
    type: NotificationType
    message: str
    read: bool = False
    created_at: Optional[datetime] = None
