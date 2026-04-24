"""
Lesson API — serves lesson data, tracks completions
Full curriculum: 130 lessons across 5 phases (A0 → B2)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import json
import os

router = APIRouter()

LESSONS_DIR = os.path.join(os.path.dirname(__file__), "../data/lessons")

# ── Full curriculum catalog ────────────────────────────────────────────────────
# Phase 1: Survival (A0 → A1)  — lessons 1–16,  free
# Phase 2: Daily Life (A1→A2)  — lessons 17–40, premium
# Phase 3: Conversations (A2→B1) — lessons 41–72, premium
# Phase 4: Fluency Bridge (B1) — lessons 73–108, premium
# Phase 5: Near-Native (B1→B2) — lessons 109–130, premium

LESSON_CATALOG = [
    # ── Phase 1: Survival ─────────────────────────────────────────────────────
    {"id": "greetings_001",    "topic": "First Hello",          "topic_ar": "أول سلام",        "level": "beginner",     "free": True,  "order": 1,   "phase": 1, "xp_reward": 30, "estimated_minutes": 8},
    {"id": "greetings_002",    "topic": "More Greetings",       "topic_ar": "تحيات أكثر",      "level": "beginner",     "free": True,  "order": 2,   "phase": 1, "xp_reward": 30, "estimated_minutes": 8},
    {"id": "numbers_001",      "topic": "Numbers 1–10",         "topic_ar": "أرقام ١–١٠",      "level": "beginner",     "free": True,  "order": 3,   "phase": 1, "xp_reward": 30, "estimated_minutes": 8},
    {"id": "numbers_002",      "topic": "Numbers 11–20",        "topic_ar": "أرقام ١١–٢٠",     "level": "beginner",     "free": True,  "order": 4,   "phase": 1, "xp_reward": 30, "estimated_minutes": 8},
    {"id": "cafe_001",         "topic": "At the Café",          "topic_ar": "في المقهى",       "level": "beginner",     "free": True,  "order": 5,   "phase": 1, "xp_reward": 35, "estimated_minutes": 9},
    {"id": "colors_001",       "topic": "Colors",               "topic_ar": "ألوان",           "level": "beginner",     "free": True,  "order": 6,   "phase": 1, "xp_reward": 30, "estimated_minutes": 8},
    {"id": "days_001",         "topic": "Days of the Week",     "topic_ar": "أيام الأسبوع",    "level": "beginner",     "free": True,  "order": 7,   "phase": 1, "xp_reward": 30, "estimated_minutes": 8},
    {"id": "time_001",         "topic": "Time & Clock",         "topic_ar": "الوقت والساعة",   "level": "beginner",     "free": True,  "order": 8,   "phase": 1, "xp_reward": 30, "estimated_minutes": 8},
    {"id": "questions_001",    "topic": "Question Words",       "topic_ar": "كلمات السؤال",    "level": "beginner",     "free": True,  "order": 9,   "phase": 1, "xp_reward": 35, "estimated_minutes": 9},
    {"id": "verbs_001",        "topic": "Essential Verbs",      "topic_ar": "أفعال أساسية",    "level": "beginner",     "free": True,  "order": 10,  "phase": 1, "xp_reward": 35, "estimated_minutes": 9},
    {"id": "family_001",       "topic": "Family",               "topic_ar": "العائلة",         "level": "beginner",     "free": True,  "order": 11,  "phase": 1, "xp_reward": 30, "estimated_minutes": 8},
    {"id": "market_001",       "topic": "At the Market",        "topic_ar": "في السوق",        "level": "beginner",     "free": True,  "order": 12,  "phase": 1, "xp_reward": 35, "estimated_minutes": 9},
    {"id": "phrases_001",      "topic": "Essential Phrases",    "topic_ar": "جمل أساسية",      "level": "beginner",     "free": True,  "order": 13,  "phase": 1, "xp_reward": 30, "estimated_minutes": 8},
    {"id": "body_001",         "topic": "Body Parts",           "topic_ar": "أجزاء الجسم",     "level": "beginner",     "free": True,  "order": 14,  "phase": 1, "xp_reward": 30, "estimated_minutes": 8},
    {"id": "weather_001",      "topic": "Weather",              "topic_ar": "الطقس",           "level": "beginner",     "free": True,  "order": 15,  "phase": 1, "xp_reward": 30, "estimated_minutes": 8},
    {"id": "conversation_001", "topic": "First Conversation",   "topic_ar": "أول حوار",        "level": "beginner",     "free": True,  "order": 16,  "phase": 1, "xp_reward": 50, "estimated_minutes": 12},

    # ── Phase 2: Daily Life ───────────────────────────────────────────────────
    {"id": "food_001",         "topic": "At the Restaurant",    "topic_ar": "في المطعم",       "level": "beginner",     "free": False, "order": 17,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "food_002",         "topic": "Food & Drinks",        "topic_ar": "طعام وشراب",      "level": "beginner",     "free": False, "order": 18,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "food_003",         "topic": "Cooking & Recipes",    "topic_ar": "طبخ ووصفات",      "level": "beginner",     "free": False, "order": 19,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "food_004",         "topic": "Ordering & Paying",    "topic_ar": "طلب ودفع",        "level": "beginner",     "free": False, "order": 20,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "directions_001",   "topic": "Asking Directions",    "topic_ar": "طلب الاتجاهات",   "level": "beginner",     "free": False, "order": 21,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "directions_002",   "topic": "Getting Around",       "topic_ar": "التنقل في المدينة","level": "beginner",     "free": False, "order": 22,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "directions_003",   "topic": "Transport",            "topic_ar": "وسائل النقل",     "level": "beginner",     "free": False, "order": 23,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "directions_004",   "topic": "In the City",          "topic_ar": "في المدينة",      "level": "beginner",     "free": False, "order": 24,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "shopping_001",     "topic": "At the Shop",          "topic_ar": "في المحل",        "level": "beginner",     "free": False, "order": 25,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "shopping_002",     "topic": "Bargaining",           "topic_ar": "المساومة",        "level": "beginner",     "free": False, "order": 26,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "shopping_003",     "topic": "Clothes & Sizes",      "topic_ar": "ملابس ومقاسات",   "level": "beginner",     "free": False, "order": 27,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "family_002",       "topic": "Talking About Family", "topic_ar": "الحديث عن العائلة","level": "beginner",     "free": False, "order": 28,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "family_003",       "topic": "My Home",              "topic_ar": "بيتي",            "level": "beginner",     "free": False, "order": 29,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "family_004",       "topic": "Daily Routine",        "topic_ar": "الروتين اليومي",  "level": "beginner",     "free": False, "order": 30,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "work_001",         "topic": "Work & Jobs",          "topic_ar": "العمل والمهن",    "level": "beginner",     "free": False, "order": 31,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "work_002",         "topic": "At the Office",        "topic_ar": "في المكتب",       "level": "beginner",     "free": False, "order": 32,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "work_003",         "topic": "Describing Work",      "topic_ar": "وصف العمل",       "level": "beginner",     "free": False, "order": 33,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "health_001",       "topic": "How Are You?",         "topic_ar": "كيف حالك؟",       "level": "beginner",     "free": False, "order": 34,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "health_002",       "topic": "At the Doctor",        "topic_ar": "عند الدكتور",     "level": "beginner",     "free": False, "order": 35,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "health_003",       "topic": "Feelings & Emotions",  "topic_ar": "مشاعر وأحاسيس",  "level": "beginner",     "free": False, "order": 36,  "phase": 2, "xp_reward": 40, "estimated_minutes": 10},
    {"id": "review_p2_001",    "topic": "Phase 2 Review",       "topic_ar": "مراجعة المرحلة ٢", "level": "beginner",     "free": False, "order": 37,  "phase": 2, "xp_reward": 60, "estimated_minutes": 15},
    {"id": "review_p2_002",    "topic": "Conversation Mix I",   "topic_ar": "حوارات متنوعة ١", "level": "beginner",     "free": False, "order": 38,  "phase": 2, "xp_reward": 60, "estimated_minutes": 15},
    {"id": "review_p2_003",    "topic": "Conversation Mix II",  "topic_ar": "حوارات متنوعة ٢", "level": "beginner",     "free": False, "order": 39,  "phase": 2, "xp_reward": 60, "estimated_minutes": 15},
    {"id": "review_p2_004",    "topic": "Conversation Mix III", "topic_ar": "حوارات متنوعة ٣", "level": "beginner",     "free": False, "order": 40,  "phase": 2, "xp_reward": 60, "estimated_minutes": 15},

    # ── Phase 3: Conversations ────────────────────────────────────────────────
    {"id": "future_001",       "topic": "Making Plans",         "topic_ar": "رح... المستقبل",  "level": "intermediate", "free": False, "order": 41,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "future_002",       "topic": "Dreams & Goals",       "topic_ar": "أحلام وأهداف",    "level": "intermediate", "free": False, "order": 42,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "future_003",       "topic": "Appointments",         "topic_ar": "مواعيد",          "level": "intermediate", "free": False, "order": 43,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "future_004",       "topic": "Weekend Plans",        "topic_ar": "خطط نهاية الأسبوع","level": "intermediate", "free": False, "order": 44,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "opinions_001",     "topic": "Likes & Dislikes",     "topic_ar": "أحب وما بحب",     "level": "intermediate", "free": False, "order": 45,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "opinions_002",     "topic": "Expressing Opinions",  "topic_ar": "التعبير عن الرأي", "level": "intermediate", "free": False, "order": 46,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "opinions_003",     "topic": "Agreeing & Disagreeing","topic_ar": "موافقة واعتراض", "level": "intermediate", "free": False, "order": 47,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "opinions_004",     "topic": "Recommendations",      "topic_ar": "توصيات",          "level": "intermediate", "free": False, "order": 48,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "plans_001",        "topic": "Making Arrangements",  "topic_ar": "ترتيب اللقاءات",  "level": "intermediate", "free": False, "order": 49,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "plans_002",        "topic": "Must & Can",           "topic_ar": "لازم وممكن",      "level": "intermediate", "free": False, "order": 50,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "plans_003",        "topic": "Invitations",          "topic_ar": "دعوات",           "level": "intermediate", "free": False, "order": 51,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "connectors_001",   "topic": "Because & But",        "topic_ar": "لأنو وبس",        "level": "intermediate", "free": False, "order": 52,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "connectors_002",   "topic": "Sequencing",           "topic_ar": "الترتيب",         "level": "intermediate", "free": False, "order": 53,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "stories_001",      "topic": "Telling Stories",      "topic_ar": "رواية القصص",     "level": "intermediate", "free": False, "order": 54,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "stories_002",      "topic": "Past Events",          "topic_ar": "أحداث ماضية",     "level": "intermediate", "free": False, "order": 55,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "stories_003",      "topic": "What Happened?",       "topic_ar": "شو صار؟",         "level": "intermediate", "free": False, "order": 56,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "stories_004",      "topic": "Anecdotes",            "topic_ar": "قصص طريفة",       "level": "intermediate", "free": False, "order": 57,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "social_001",       "topic": "Social Situations",    "topic_ar": "مواقف اجتماعية",  "level": "intermediate", "free": False, "order": 58,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "social_002",       "topic": "At a Party",           "topic_ar": "في الحفلة",       "level": "intermediate", "free": False, "order": 59,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "social_003",       "topic": "Making Friends",       "topic_ar": "تكوين صداقات",    "level": "intermediate", "free": False, "order": 60,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "social_004",       "topic": "Compliments",          "topic_ar": "مجاملات",         "level": "intermediate", "free": False, "order": 61,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "negation_001",     "topic": "Negation Patterns",    "topic_ar": "النفي",           "level": "intermediate", "free": False, "order": 62,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "negation_002",     "topic": "Saying No",            "topic_ar": "قول لا",          "level": "intermediate", "free": False, "order": 63,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "negation_003",     "topic": "Contradiction",        "topic_ar": "التعارض",         "level": "intermediate", "free": False, "order": 64,  "phase": 3, "xp_reward": 50, "estimated_minutes": 12},
    {"id": "review_p3_001",    "topic": "Conversation Challenge I",  "topic_ar": "تحدي حوار ١","level": "intermediate", "free": False, "order": 65,  "phase": 3, "xp_reward": 75, "estimated_minutes": 18},
    {"id": "review_p3_002",    "topic": "Conversation Challenge II", "topic_ar": "تحدي حوار ٢","level": "intermediate", "free": False, "order": 66,  "phase": 3, "xp_reward": 75, "estimated_minutes": 18},
    {"id": "review_p3_003",    "topic": "Conversation Challenge III","topic_ar": "تحدي حوار ٣","level": "intermediate", "free": False, "order": 67,  "phase": 3, "xp_reward": 75, "estimated_minutes": 18},
    {"id": "review_p3_004",    "topic": "Listening Challenge I",     "topic_ar": "تحدي استماع ١","level": "intermediate","free": False, "order": 68, "phase": 3, "xp_reward": 75, "estimated_minutes": 18},
    {"id": "review_p3_005",    "topic": "Listening Challenge II",    "topic_ar": "تحدي استماع ٢","level": "intermediate","free": False, "order": 69, "phase": 3, "xp_reward": 75, "estimated_minutes": 18},
    {"id": "review_p3_006",    "topic": "Listening Challenge III",   "topic_ar": "تحدي استماع ٣","level": "intermediate","free": False, "order": 70, "phase": 3, "xp_reward": 75, "estimated_minutes": 18},
    {"id": "review_p3_007",    "topic": "Phase 3 Final I",      "topic_ar": "نهاية المرحلة ٣ أ","level": "intermediate","free": False, "order": 71, "phase": 3, "xp_reward": 100,"estimated_minutes": 20},
    {"id": "review_p3_008",    "topic": "Phase 3 Final II",     "topic_ar": "نهاية المرحلة ٣ ب","level": "intermediate","free": False, "order": 72, "phase": 3, "xp_reward": 100,"estimated_minutes": 20},

    # ── Phase 4: Fluency Bridge ───────────────────────────────────────────────
    {"id": "stories_005",      "topic": "Complex Narratives",   "topic_ar": "قصص معقدة",       "level": "intermediate", "free": False, "order": 73,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "stories_006",      "topic": "Life Stories",         "topic_ar": "قصص الحياة",      "level": "intermediate", "free": False, "order": 74,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "stories_007",      "topic": "Shared Memories",      "topic_ar": "ذكريات مشتركة",   "level": "intermediate", "free": False, "order": 75,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "stories_008",      "topic": "Storytelling Techniques","topic_ar": "فن رواية القصص", "level": "intermediate", "free": False, "order": 76,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "stories_009",      "topic": "Emotions in Stories",  "topic_ar": "مشاعر في القصص",  "level": "intermediate", "free": False, "order": 77,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "relationships_001","topic": "Describing People",    "topic_ar": "وصف الناس",       "level": "intermediate", "free": False, "order": 78,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "relationships_002","topic": "Relationships",        "topic_ar": "العلاقات",        "level": "intermediate", "free": False, "order": 79,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "relationships_003","topic": "Conflict & Resolution","topic_ar": "خلافات وحلول",    "level": "intermediate", "free": False, "order": 80,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "relationships_004","topic": "Love & Friendship",    "topic_ar": "حب وصداقة",       "level": "intermediate", "free": False, "order": 81,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "travel_001",       "topic": "At the Airport",       "topic_ar": "في المطار",       "level": "intermediate", "free": False, "order": 82,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "travel_002",       "topic": "Hotels",               "topic_ar": "الفنادق",         "level": "intermediate", "free": False, "order": 83,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "travel_003",       "topic": "Getting Lost",         "topic_ar": "أنا تايه",        "level": "intermediate", "free": False, "order": 84,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "travel_004",       "topic": "Sightseeing",          "topic_ar": "السياحة",         "level": "intermediate", "free": False, "order": 85,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "culture_001",      "topic": "Levantine Traditions", "topic_ar": "تقاليد لبنانية",  "level": "intermediate", "free": False, "order": 86,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "culture_002",      "topic": "Holidays & Feasts",    "topic_ar": "أعياد وأفراح",    "level": "intermediate", "free": False, "order": 87,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "culture_003",      "topic": "Food Culture",         "topic_ar": "ثقافة الطعام",    "level": "intermediate", "free": False, "order": 88,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "culture_004",      "topic": "Music & Art",          "topic_ar": "موسيقى وفن",      "level": "intermediate", "free": False, "order": 89,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "conditional_001",  "topic": "If Sentences",         "topic_ar": "جمل الشرط (إذا)", "level": "intermediate", "free": False, "order": 90,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "conditional_002",  "topic": "Hypotheticals",        "topic_ar": "الفرضيات (لو)",   "level": "intermediate", "free": False, "order": 91,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "conditional_003",  "topic": "Wishes & Regrets",     "topic_ar": "أمنيات وندم",     "level": "intermediate", "free": False, "order": 92,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "conditional_004",  "topic": "Conditional Plans",    "topic_ar": "خطط مشروطة",      "level": "intermediate", "free": False, "order": 93,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "media_001",        "topic": "News Headlines",       "topic_ar": "عناوين الأخبار",  "level": "intermediate", "free": False, "order": 94,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "media_002",        "topic": "Social Media",         "topic_ar": "التواصل الاجتماعي","level": "intermediate", "free": False, "order": 95,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "media_003",        "topic": "Phone Calls",          "topic_ar": "مكالمات هاتفية",  "level": "intermediate", "free": False, "order": 96,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "media_004",        "topic": "Text Messages",        "topic_ar": "رسائل نصية",      "level": "intermediate", "free": False, "order": 97,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "grammar_001",      "topic": "Relative Clauses",     "topic_ar": "الجمل الوصفية (اللي)","level": "intermediate","free": False,"order": 98, "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "grammar_002",      "topic": "Sentence Structure",   "topic_ar": "بناء الجملة",     "level": "intermediate", "free": False, "order": 99,  "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "grammar_003",      "topic": "Advanced Negation",    "topic_ar": "النفي المتقدم",   "level": "intermediate", "free": False, "order": 100, "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "idioms_001",       "topic": "Levantine Idioms I",   "topic_ar": "تعابير لبنانية ١", "level": "intermediate", "free": False, "order": 101, "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "idioms_002",       "topic": "Levantine Idioms II",  "topic_ar": "تعابير لبنانية ٢", "level": "intermediate", "free": False, "order": 102, "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "idioms_003",       "topic": "Levantine Idioms III", "topic_ar": "تعابير لبنانية ٣", "level": "intermediate", "free": False, "order": 103, "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "idioms_004",       "topic": "Levantine Idioms IV",  "topic_ar": "تعابير لبنانية ٤", "level": "intermediate", "free": False, "order": 104, "phase": 4, "xp_reward": 65, "estimated_minutes": 15},
    {"id": "listening_001",    "topic": "Listening Challenge I",    "topic_ar": "تحدي استماع ١","level": "intermediate", "free": False, "order": 105, "phase": 4, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "listening_002",    "topic": "Listening Challenge II",   "topic_ar": "تحدي استماع ٢","level": "intermediate", "free": False, "order": 106, "phase": 4, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "listening_003",    "topic": "Listening Challenge III",  "topic_ar": "تحدي استماع ٣","level": "intermediate", "free": False, "order": 107, "phase": 4, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "listening_004",    "topic": "Listening Challenge IV",   "topic_ar": "تحدي استماع ٤","level": "intermediate", "free": False, "order": 108, "phase": 4, "xp_reward": 80, "estimated_minutes": 18},

    # ── Phase 5: Near-Native ──────────────────────────────────────────────────
    {"id": "humor_001",        "topic": "Humor & Wordplay",     "topic_ar": "دعابة ولعب بالكلام","level": "advanced",   "free": False, "order": 109, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "humor_002",        "topic": "Sarcasm & Irony",      "topic_ar": "سخرية وتهكم",     "level": "advanced",     "free": False, "order": 110, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "humor_003",        "topic": "Jokes",                "topic_ar": "نكت ومزح",        "level": "advanced",     "free": False, "order": 111, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "humor_004",        "topic": "Funny Stories",        "topic_ar": "قصص مضحكة",       "level": "advanced",     "free": False, "order": 112, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "idioms_005",       "topic": "Advanced Idioms I",    "topic_ar": "تعابير متقدمة ١",  "level": "advanced",     "free": False, "order": 113, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "idioms_006",       "topic": "Advanced Idioms II",   "topic_ar": "تعابير متقدمة ٢",  "level": "advanced",     "free": False, "order": 114, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "idioms_007",       "topic": "Advanced Idioms III",  "topic_ar": "تعابير متقدمة ٣",  "level": "advanced",     "free": False, "order": 115, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "idioms_008",       "topic": "Advanced Idioms IV",   "topic_ar": "تعابير متقدمة ٤",  "level": "advanced",     "free": False, "order": 116, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "dialect_pal_001",  "topic": "Arabic Dialect: Words","topic_ar": "لهجة عربية: كلمات","level": "advanced",     "free": False, "order": 117, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "dialect_pal_002",  "topic": "Arabic Dialect: Sound","topic_ar": "لهجة عربية: نطق", "level": "advanced",     "free": False, "order": 118, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "dialect_pal_003",  "topic": "Arabic Dialect: Phrases","topic_ar": "لهجة عربية: جمل","level": "advanced",    "free": False, "order": 119, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "dialect_pal_004",  "topic": "Arabic Dialect: Slang","topic_ar": "لهجة عربية: عامية","level": "advanced",    "free": False, "order": 120, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "dialect_leb_001",  "topic": "Lebanese Variants I",  "topic_ar": "اللهجة اللبنانية ١","level": "advanced",   "free": False, "order": 121, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "dialect_leb_002",  "topic": "Lebanese Variants II", "topic_ar": "اللهجة اللبنانية ٢","level": "advanced",   "free": False, "order": 122, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "dialect_leb_003",  "topic": "Lebanese Variants III","topic_ar": "اللهجة اللبنانية ٣","level": "advanced",   "free": False, "order": 123, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "dialect_syr_001",  "topic": "Syrian Variants I",    "topic_ar": "اللهجة السورية ١", "level": "advanced",     "free": False, "order": 124, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "dialect_syr_002",  "topic": "Syrian Variants II",   "topic_ar": "اللهجة السورية ٢", "level": "advanced",     "free": False, "order": 125, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "dialect_syr_003",  "topic": "Syrian Variants III",  "topic_ar": "اللهجة السورية ٣", "level": "advanced",     "free": False, "order": 126, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "professional_001", "topic": "Professional Settings","topic_ar": "بيئة العمل",       "level": "advanced",     "free": False, "order": 127, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "professional_002", "topic": "Meetings",             "topic_ar": "اجتماعات",        "level": "advanced",     "free": False, "order": 128, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "professional_003", "topic": "Negotiations",         "topic_ar": "مفاوضات",         "level": "advanced",     "free": False, "order": 129, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
    {"id": "professional_004", "topic": "Phone Calls (Pro)",    "topic_ar": "مكالمات احترافية", "level": "advanced",     "free": False, "order": 130, "phase": 5, "xp_reward": 80, "estimated_minutes": 18},
]


@router.get("/catalog")
def get_catalog(is_premium: bool = False):
    """Return lesson catalog with locked state for free users."""
    result = []
    for i, lesson in enumerate(LESSON_CATALOG):
        item = dict(lesson)
        # Phase 1 is always free; Phase 2+ requires premium
        item["locked"] = not lesson["free"] and not is_premium
        # Mark completed based on progress — placeholder (always False for now)
        item["completed"] = False
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
    phase = next((l["phase"] for l in LESSON_CATALOG if l["id"] == payload.lesson_id), None)
    if phase == 2 and payload.lesson_id.startswith("food_001"):
        badges.append("phase_2_start")
    return badges
