"""
Lesson API — serves lesson data, tracks completions.
Catalog is built dynamically from backend/data/lessons/*.json.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import os
import glob

router = APIRouter()

LESSONS_DIR = os.path.join(os.path.dirname(__file__), "../data/lessons")


def _infer_level(order: int) -> str:
    if order <= 12:  return "A1"
    if order <= 24:  return "A2"
    if order <= 36:  return "B1"
    return "B2"


def _build_catalog() -> list[dict]:
    entries = []
    for path in sorted(glob.glob(os.path.join(LESSONS_DIR, "*.json"))):
        lesson_id = os.path.basename(path).replace(".json", "")
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue
        suffix = lesson_id.rsplit("_", 1)[-1]
        order  = int(suffix) if suffix.isdigit() else 99
        level  = _infer_level(order)
        entries.append({
            "id":                lesson_id,
            "topic":             data.get("topic", lesson_id),
            "topic_ar":          data.get("topic_ar", ""),
            "level":             level,
            "free":              order == 1,
            "locked":            False,
            "order":             order,
            "xp_reward":         50,
            "estimated_minutes": 15,
            "completed":         False,
        })
    entries.sort(key=lambda x: x["order"])
    return entries


@router.get("/catalog")
def get_catalog(is_premium: bool = False):
    """Return lesson catalog built from lesson files on disk."""
    lessons = _build_catalog()
    return {"lessons": lessons, "total": len(lessons)}


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
    score: int
    time_spent_sec: int
    xp_earned: int
    words_studied: list[str]


@router.post("/{lesson_id}/complete")
def complete_lesson(lesson_id: str, payload: LessonCompletePayload):
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
