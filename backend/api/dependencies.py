"""
FastAPI dependencies — inject into any route that requires authentication.

Usage:
    @router.get("/protected")
    def my_route(user: dict = Depends(get_current_user)):
        return {"user_id": user["id"]}
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_client import get_supabase
import logging

logger = logging.getLogger(__name__)
bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    """
    Verify the Supabase JWT from the Authorization: Bearer <token> header.
    Returns the Supabase user object dict on success.
    Raises 401 on invalid / expired tokens.
    """
    token = credentials.credentials
    try:
        supabase = get_supabase()
        response = supabase.auth.get_user(token)
        user = response.user
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return {
            "id": user.id,
            "email": user.email,
            "metadata": user.user_metadata or {},
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Token verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> dict | None:
    """Same as get_current_user but returns None instead of raising for public routes."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials)
    except HTTPException:
        return None
