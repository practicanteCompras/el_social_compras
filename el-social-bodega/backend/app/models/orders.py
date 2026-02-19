from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class OrderStatus(str, Enum):
    draft = "draft"
    sent = "sent"
    in_review = "in_review"
    approved = "approved"
    dispatched = "dispatched"
    delivered = "delivered"
    rejected = "rejected"


VALID_TRANSITIONS = {
    OrderStatus.draft: [OrderStatus.sent],
    OrderStatus.sent: [OrderStatus.in_review],
    OrderStatus.in_review: [OrderStatus.approved, OrderStatus.rejected],
    OrderStatus.approved: [OrderStatus.dispatched],
    OrderStatus.dispatched: [OrderStatus.delivered],
    OrderStatus.rejected: [OrderStatus.draft],
    OrderStatus.delivered: [],
}


class OrderCreate(BaseModel):
    sede_id: int


class OrderItemCreate(BaseModel):
    product_id: int
    quantity_requested: int


class OrderItemUpdate(BaseModel):
    quantity_requested: Optional[int] = None


class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: int
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    quantity_requested: int
    suggested_supplier_id: Optional[int] = None
    suggested_supplier_name: Optional[str] = None
    suggested_price: Optional[float] = None
    highest_price: Optional[float] = None
    savings_per_item: Optional[float] = None


class OrderResponse(BaseModel):
    id: int
    sede_id: int
    sede_name: Optional[str] = None
    user_id: str
    user_email: Optional[str] = None
    status: OrderStatus
    items: Optional[List[OrderItemResponse]] = None
    total_suggested_cost: Optional[float] = None
    total_highest_cost: Optional[float] = None
    total_savings: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class StatusUpdate(BaseModel):
    status: OrderStatus
