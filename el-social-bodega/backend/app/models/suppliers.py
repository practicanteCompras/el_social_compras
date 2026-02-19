from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class SupplierBase(BaseModel):
    nit: str
    company_name: str
    category: str
    advisor_name: Optional[str] = None
    contact_phone_1: str
    contact_phone_2: Optional[str] = None
    email: Optional[EmailStr] = None
    response_days: Optional[int] = None
    credit_days: Optional[int] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    nit: Optional[str] = None
    company_name: Optional[str] = None
    category: Optional[str] = None
    advisor_name: Optional[str] = None
    contact_phone_1: Optional[str] = None
    contact_phone_2: Optional[str] = None
    email: Optional[EmailStr] = None
    response_days: Optional[int] = None
    credit_days: Optional[int] = None


class SupplierResponse(SupplierBase):
    id: int
    created_at: Optional[datetime] = None
