from functools import lru_cache

from supabase import create_client, Client

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Anon client — cached singleton, used for auth operations."""
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_key)


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Service role client — cached singleton, bypasses RLS."""
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key)
