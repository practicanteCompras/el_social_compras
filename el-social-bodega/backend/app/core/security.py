"""
Auth dependencies for FastAPI.
Provides JWT decoding, user extraction, and role-based access control.
"""

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt

from app.core.config import get_settings
from app.db.client import get_supabase_admin
from app.models.auth import UserRole


def get_current_user(request: Request) -> dict:
    """
    Extracts Bearer token from Authorization header, decodes JWT,
    and fetches user profile from Supabase users table.
    Returns dict with id, email, role, sede_id.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing token",
        )

    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    supabase = get_supabase_admin()
    response = supabase.table("users").select("id, email, role, sede_id").eq("id", sub).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user = response.data
    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "sede_id": user.get("sede_id"),
    }


def require_role(*roles: UserRole):
    """
    Returns a dependency that checks if the current user's role
    is in the allowed roles. Raises 403 if not.
    """

    async def _check_role(
        current_user: dict = Depends(get_current_user),
    ) -> dict:
        user_role = current_user.get("role")
        if user_role not in [r.value for r in roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _check_role


require_admin = require_role(UserRole.admin)
require_user_or_admin = require_role(UserRole.admin, UserRole.user)
require_any_role = require_role(UserRole.admin, UserRole.user, UserRole.reviewer)
