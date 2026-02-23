from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.v1.routes import auth, suppliers, inventory, orders, dashboard, notifications, data_import

settings = get_settings()

app = FastAPI(
    title="El Social Bodega API",
    description="Warehouse Management System for El Social Medellín S.A.S",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(suppliers.router, prefix="/api/v1/suppliers", tags=["Suppliers"])
app.include_router(inventory.router, prefix="/api/v1", tags=["Inventory"])
app.include_router(orders.router, prefix="/api/v1/orders", tags=["Orders"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(data_import.router, prefix="/api/v1/import", tags=["Import"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
