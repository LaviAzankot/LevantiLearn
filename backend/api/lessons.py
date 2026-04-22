"""
Lesson API — serves lesson data, tracks completions
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import json
import os

router = APIRouter()

LESSONS_DIR = os.path.join(os.path.dirname(__file__), "../data/lessons")

LESSON_CATALOG = [
    {"id": "greetings_001",  "topic": "Greetings",       "topic_ar": "تحيات",       "level": "beginner", "free": True,  "order": 1},
    {"id": "greetings_002",  "topic": "Introductions",   "topic_ar": "تعارف",       "level": "beginner", "free": True,  "order": 2},
    {"id": "food_001",       "topic": "Food & Café",     "topic_ar": "طعام ومقهى",  "level": "beginner", "free": True,  "order": 3},
    {"id": "food_002",       "topic": "At the Market",   "topic_ar": "في السوق",    "level": "beginner", "free": False, "order": 4},
    {"id": "directions_001", "topic": "Directions",      "topic_ar": "اتجاهات",     "level": "beginner", "free": True,  "order": 5},
    {"id": "shopping_001",   "topic": "Shopping",        "topic_ar": "تسوق",        "level": "beginner", "free": False, "order": 6},
    {"id": "family_001",     "topic": "Family",          "topic_ar": "عائلة",       "level": "beginner", "free": False, "order": 7},
    {"id": "travel_001",     "topic": "Travel in Levant","topic_ar": "السفر",       "level": "intermediate", "free": False, "order": 8},
    {"id": "numbers_001",    "topic": "Numbers",         "topic_ar": "أرقام",       "level": "beginner", "free": True,  "order": 9},
    {"id": "culture_001",    "topic": "Culture & Customs","topic_ar": "ثقافة",      "level": "intermediate", "free": False, "order": 10},
]


@router.get("/catalog")
def get_catalog(is_premium: bool = False):
    """Return lesson catalog — show locked state for free users."""
    result = []
    for lesson in LESSON_CATALOG:
        item = dict(lesson)
        item["locked"] = not lesson["free"] and not is_premium
        result.append(item)
    return {"lessons": result, "total": len(result)}


@router.get("/{lesson_id}")
def get_lesson(lesson_id: str):
    """Load a lesson JSON by ID."""
    lesson_path = os.path.join(LESSONS_DIR, f"{lesson_id}.json")
    if not os.path.exists(lesson_path):
        raise HTTPException(status_code=404, detail=f"Lesson '{lesson_id}' not found")
    with open(lesson_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


class LessonCompletePayload(BaseModel):
    user_id: str
    lesson_id: str
    score: int          # 0–100
    time_spent_sec: int
    xp_earned: int
    words_studied: list[str]


@router.post("/{lesson_id}/complete")
def complete_lesson(lesson_id: str, payload: LessonCompletePayload):
    """
    Record lesson completion, award XP, schedule SRS reviews.
    In production: write to PostgreSQL, update streak, etc.
    """
    # Placeholder — integrate with DB service
    return {
        "success": True,
        "lesson_id": lesson_id,
        "xp_earned": payload.xp_earned,
        "streak_updated": True,
        "srs_cards_scheduled": len(payload.words_studied),
        "badges_earned": _check_badges(payload),
    }


def _check_badges(payload: LessonCompletePayload) -> list[str]:
    badges = []
    if payload.score == 100:
        badges.append("perfect_score")
    if payload.lesson_id == "greetings_001":
        badges.append("first_lesson")
    return badges
