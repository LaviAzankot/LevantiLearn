"""
Database models — SQLAlchemy ORM for PostgreSQL
Use with: pip install sqlalchemy asyncpg alembic
Supabase (hosted PostgreSQL) recommended for production.
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid

Base = declarative_base()


def gen_id():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    firebase_uid = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    display_name = Column(String)
    native_language = Column(String, default="he")   # Hebrew default for Israeli audience
    is_premium = Column(Boolean, default=False)
    xp_total = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    streak_last_date = Column(DateTime, nullable=True)
    daily_goal_minutes = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)

    progress = relationship("UserProgress", back_populates="user")
    srs_cards = relationship("SRSCard", back_populates="user")
    badges = relationship("UserBadge", back_populates="user")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(String, primary_key=True)          # e.g. "greetings_001"
    topic = Column(String, nullable=False)
    topic_ar = Column(String)
    level = Column(String, default="beginner")
    xp_reward = Column(Integer, default=50)
    is_free = Column(Boolean, default=False)
    order_index = Column(Integer, default=0)
    lesson_data = Column(JSON)                      # full lesson JSON
    created_at = Column(DateTime, default=datetime.utcnow)


class UserProgress(Base):
    __tablename__ = "user_progress"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id"),)

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(String, ForeignKey("lessons.id"), nullable=False)
    completed = Column(Boolean, default=False)
    score = Column(Integer, default=0)              # 0–100
    time_spent_sec = Column(Integer, default=0)
    attempts = Column(Integer, default=0)
    xp_earned = Column(Integer, default=0)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="progress")


class SRSCard(Base):
    """One flashcard per word per user."""
    __tablename__ = "srs_cards"
    __table_args__ = (UniqueConstraint("user_id", "word_id"),)

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    word_id = Column(String, nullable=False)        # e.g. "w001" from lesson JSON
    arabic = Column(String, nullable=False)
    romanization = Column(String)
    english = Column(String)
    lesson_id = Column(String)

    # SM-2 algorithm fields
    repetitions = Column(Integer, default=0)
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=1)
    next_review = Column(DateTime, default=datetime.utcnow)
    total_reviews = Column(Integer, default=0)
    correct_reviews = Column(Integer, default=0)
    last_reviewed = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="srs_cards")


class Badge(Base):
    __tablename__ = "badges"

    id = Column(String, primary_key=True)           # e.g. "first_lesson"
    name = Column(String, nullable=False)
    description = Column(String)
    icon = Column(String)                           # emoji or icon name
    xp_bonus = Column(Integer, default=0)
    condition_type = Column(String)                 # "lesson_count", "streak", "score", etc.
    condition_value = Column(Integer)


class UserBadge(Base):
    __tablename__ = "user_badges"
    __table_args__ = (UniqueConstraint("user_id", "badge_id"),)

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    badge_id = Column(String, ForeignKey("badges.id"), nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="badges")


# --- Seed data for badges ---
BADGE_SEEDS = [
    {"id": "first_lesson",   "name": "First Step",      "icon": "🎯", "description": "Complete your first lesson",             "xp_bonus": 20},
    {"id": "week_streak",    "name": "Week Warrior",    "icon": "🔥", "description": "Maintain a 7-day streak",                "xp_bonus": 50},
    {"id": "perfect_score",  "name": "Perfectionist",   "icon": "💯", "description": "Get 100% on any lesson",                 "xp_bonus": 30},
    {"id": "coffee_expert",  "name": "Coffee Expert",   "icon": "☕", "description": "Complete the Food & Café lesson",        "xp_bonus": 25},
    {"id": "chatterbox",     "name": "Chatterbox",      "icon": "🗣️", "description": "Complete 5 pronunciation exercises",     "xp_bonus": 40},
    {"id": "scholar_50",     "name": "Word Scholar",    "icon": "📚", "description": "Learn 50 words",                         "xp_bonus": 60},
    {"id": "explorer",       "name": "Levant Explorer", "icon": "🗺️", "description": "Start 5 different topic paths",          "xp_bonus": 50},
    {"id": "month_streak",   "name": "Dedicated",       "icon": "📅", "description": "Maintain a 30-day streak",              "xp_bonus": 150},
]
