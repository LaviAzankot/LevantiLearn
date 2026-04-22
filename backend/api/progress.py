"""
Progress API — real Supabase DB for streaks, XP, SRS cards.
All routes require authentication via Bearer token.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from datetime import datetime, date, timedelta
from services.supabase_client import get_supabase
from api.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ReviewPayload(BaseModel):
    word_id: str
    button: str   # "hard" | "ok" | "good" | "easy"


class AddCardsPayload(BaseModel):
    lesson_id: str
    words: List[dict]   # [{ word_id, arabic, romanization, english }]


class CompleteLessonPayload(BaseModel):
    lesson_id: str
    score: int
    xp_earned: int
    time_spent_sec: int
    words_studied: List[str]


# ── SRS helpers ───────────────────────────────────────────────────────────────

BUTTON_QUALITY = {"hard": 1, "ok": 2, "good": 3, "easy": 4}

def _sm2(repetitions: int, ease: float, interval: int, quality: int):
    """SM-2 algorithm. Returns (new_repetitions, new_ease, new_interval_days)."""
    if quality < 2:
        return 0, max(1.3, ease - 0.2), 1
    new_ease = ease + 0.1 - (4 - quality) * (0.08 + (4 - quality) * 0.02)
    new_ease = max(1.3, new_ease)
    if repetitions == 0:
        new_interval = 1
    elif repetitions == 1:
        new_interval = 6
    else:
        new_interval = round(interval * new_ease)
    return repetitions + 1, new_ease, new_interval


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/srs/due")
def get_due_cards(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """Return SRS cards due for review (next_review <= now)."""
    supabase = get_supabase()
    now = datetime.utcnow().isoformat()

    result = (
        supabase.table("srs_cards")
        .select("*")
        .eq("user_id", current_user["id"])
        .lte("next_review", now)
        .order("next_review")
        .limit(limit)
        .execute()
    )
    cards = result.data or []
    return {"cards": cards, "total_due": len(cards)}


@router.post("/srs/review")
def review_card(
    payload: ReviewPayload,
    current_user: dict = Depends(get_current_user),
):
    """Process an SRS review — updates SM-2 state in DB."""
    supabase = get_supabase()
    user_id = current_user["id"]

    existing = (
        supabase.table("srs_cards")
        .select("*")
        .eq("user_id", user_id)
        .eq("word_id", payload.word_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Card not found")

    card = existing.data
    quality = BUTTON_QUALITY.get(payload.button, 2)
    new_reps, new_ease, new_interval = _sm2(
        card["repetitions"], card["ease_factor"], card["interval_days"], quality
    )
    next_review = (datetime.utcnow() + timedelta(days=new_interval)).isoformat()

    supabase.table("srs_cards").update({
        "repetitions": new_reps,
        "ease_factor": new_ease,
        "interval_days": new_interval,
        "next_review": next_review,
    }).eq("user_id", user_id).eq("word_id", payload.word_id).execute()

    return {
        "success": True,
        "interval_days": new_interval,
        "next_review": next_review,
        "ease_factor": round(new_ease, 2),
    }


@router.post("/srs/add-cards")
def add_cards(
    payload: AddCardsPayload,
    current_user: dict = Depends(get_current_user),
):
    """Add new SRS cards after lesson completion (upsert — skip duplicates)."""
    supabase = get_supabase()
    user_id = current_user["id"]
    now = datetime.utcnow().isoformat()

    rows = [
        {
            "user_id": user_id,
            "word_id": w["word_id"],
            "arabic": w["arabic"],
            "romanization": w.get("romanization", ""),
            "english": w.get("english", ""),
            "lesson_id": payload.lesson_id,
            "repetitions": 0,
            "ease_factor": 2.5,
            "interval_days": 1,
            "next_review": now,
        }
        for w in payload.words
    ]

    supabase.table("srs_cards").upsert(rows, on_conflict="user_id,word_id").execute()
    return {"success": True, "cards_added": len(rows)}


@router.post("/lesson/complete")
def complete_lesson(
    payload: CompleteLessonPayload,
    current_user: dict = Depends(get_current_user),
):
    """
    Record lesson completion:
    - Upsert lesson_progress row
    - Add XP to profile
    - Update streak if first activity today
    """
    supabase = get_supabase()
    user_id = current_user["id"]
    today = date.today().isoformat()

    # Upsert lesson progress
    supabase.table("lesson_progress").upsert({
        "user_id": user_id,
        "lesson_id": payload.lesson_id,
        "completed": payload.score >= 65,
        "score": payload.score,
        "xp_earned": payload.xp_earned,
        "completed_at": datetime.utcnow().isoformat(),
    }, on_conflict="user_id,lesson_id").execute()

    # Fetch current profile
    prof = supabase.table("profiles").select(
        "xp_total,streak_days,streak_last_date"
    ).eq("id", user_id).single().execute()
    profile = prof.data or {}

    new_xp = (profile.get("xp_total") or 0) + payload.xp_earned
    new_streak = profile.get("streak_days") or 0
    last_date = profile.get("streak_last_date")

    if last_date != today:
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        new_streak = (new_streak + 1) if last_date == yesterday else 1

    supabase.table("profiles").update({
        "xp_total": new_xp,
        "streak_days": new_streak,
        "streak_last_date": today,
    }).eq("id", user_id).execute()

    return {
        "success": True,
        "xp_total": new_xp,
        "streak_days": new_streak,
        "xp_earned": payload.xp_earned,
    }


@router.get("/stats")
def get_stats(current_user: dict = Depends(get_current_user)):
    """Return full user stats from Supabase."""
    supabase = get_supabase()
    user_id = current_user["id"]

    # Profile
    prof = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    profile = prof.data or {}

    # Lesson count
    lessons = (
        supabase.table("lesson_progress")
        .select("lesson_id, score")
        .eq("user_id", user_id)
        .eq("completed", True)
        .execute()
    )
    lessons_completed = len(lessons.data or [])

    # SRS counts
    srs_all = supabase.table("srs_cards").select("next_review, interval_days").eq("user_id", user_id).execute()
    srs_cards = srs_all.data or []
    now = datetime.utcnow().isoformat()
    due_today = sum(1 for c in srs_cards if c["next_review"] <= now)
    mature = sum(1 for c in srs_cards if c["interval_days"] >= 21)

    # Topic progress (from lesson_progress)
    topic_rows = (
        supabase.table("lesson_progress")
        .select("lesson_id, score")
        .eq("user_id", user_id)
        .execute()
    )

    return {
        "xp_total": profile.get("xp_total", 0),
        "streak_days": profile.get("streak_days", 0),
        "lessons_completed": lessons_completed,
        "words_learned": len(srs_cards),
        "srs": {
            "total_cards": len(srs_cards),
            "due_today": due_today,
            "mature": mature,
        },
    }


@router.post("/streak/check")
def check_streak(current_user: dict = Depends(get_current_user)):
    """Called on app open — maintains streak if user opened app today."""
    supabase = get_supabase()
    user_id = current_user["id"]
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    prof = supabase.table("profiles").select(
        "streak_days,streak_last_date"
    ).eq("id", user_id).single().execute()
    profile = prof.data or {}

    last_date = profile.get("streak_last_date")
    streak = profile.get("streak_days", 0)

    if last_date == today:
        return {"streak_days": streak, "streak_maintained": True}

    if last_date == yesterday:
        pass  # streak continues — will be updated on lesson complete
    else:
        # streak broken
        streak = 0
        supabase.table("profiles").update({"streak_days": 0}).eq("id", user_id).execute()

    return {"streak_days": streak, "streak_maintained": last_date == yesterday}
