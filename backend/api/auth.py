"""
Auth API — Supabase JWT verification + user profile management.
All user data is stored in Supabase (profiles table).
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from services.supabase_client import get_supabase
from api.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class SignUpPayload(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class SignInPayload(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    daily_goal_minutes: Optional[int] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/signup", status_code=201)
def sign_up(payload: SignUpPayload):
    """
    Register a new user via Supabase Auth.
    The DB trigger (handle_new_user) auto-creates the profiles row.
    """
    supabase = get_supabase()
    try:
        res = supabase.auth.admin.create_user({
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,          # skip email verification in dev
            "user_metadata": {"display_name": payload.display_name},
        })
        user = res.user
        if user is None:
            raise HTTPException(status_code=400, detail="Sign-up failed")
        return {
            "message": "Account created",
            "user_id": user.id,
            "email": user.email,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("sign_up error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signin")
def sign_in(payload: SignInPayload):
    """
    Sign in with email + password. Returns Supabase session tokens.
    The frontend stores access_token and uses it as Bearer on all API calls.
    """
    supabase = get_supabase()
    try:
        res = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password,
        })
        session = res.session
        user = res.user
        if session is None or user is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Fetch profile from DB
        profile = supabase.table("profiles").select("*").eq("id", user.id).single().execute()
        profile_data = profile.data or {}

        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "expires_in": session.expires_in,
            "user": {
                "id": user.id,
                "email": user.email,
                "display_name": profile_data.get("display_name", user.email.split("@")[0]),
                "is_premium": profile_data.get("is_premium", False),
                "xp_total": profile_data.get("xp_total", 0),
                "streak_days": profile_data.get("streak_days", 0),
                "daily_goal_minutes": profile_data.get("daily_goal_minutes", 10),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("sign_in error: %s", e)
        raise HTTPException(status_code=401, detail="Invalid email or password")


@router.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    supabase = get_supabase()
    user_id = current_user["id"]

    profile = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    data = profile.data
    return {
        "id": user_id,
        "email": current_user["email"],
        "display_name": data.get("display_name", ""),
        "is_premium": data.get("is_premium", False),
        "xp_total": data.get("xp_total", 0),
        "streak_days": data.get("streak_days", 0),
        "daily_goal_minutes": data.get("daily_goal_minutes", 10),
        "created_at": data.get("created_at"),
    }


@router.patch("/profile")
def update_profile(
    payload: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update display_name or daily_goal_minutes."""
    supabase = get_supabase()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    supabase.table("profiles").update(updates).eq("id", current_user["id"]).execute()
    return {"success": True}


@router.post("/refresh")
def refresh_token(refresh_token: str):
    """Exchange a refresh token for a new access token."""
    supabase = get_supabase()
    try:
        res = supabase.auth.refresh_session(refresh_token)
        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "expires_in": res.session.expires_in,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Refresh failed")
