"""
Vocabulary API
Queries the Maknuune Palestinian Arabic Lexicon
(CC-BY-SA license — 36,000 entries)

Dataset: https://github.com/CAMeL-Lab/maknuune
Also uses the Levanti Hugging Face dataset:
  https://huggingface.co/datasets/CAMeL-Lab/Levanti
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import json
import csv

router = APIRouter()

# Path to local Maknuune CSV (download from GitHub, CC-BY-SA)
MAKNUUNE_PATH = os.path.join(os.path.dirname(__file__), "../data/maknuune.csv")
_vocab_cache: list[dict] = []


def load_maknuune() -> list[dict]:
    global _vocab_cache
    if _vocab_cache:
        return _vocab_cache
    if not os.path.exists(MAKNUUNE_PATH):
        return []
    entries = []
    with open(MAKNUUNE_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            entries.append({
                "arabic": row.get("CAPHI_ARABIC", row.get("ARABIC", "")),
                "romanization": row.get("CAPHI", row.get("CAPHI_ROMAN", "")),
                "english": row.get("GLOSS", row.get("ENGLISH", "")),
                "pos": row.get("POS", ""),
                "root": row.get("ROOT", ""),
                "dialect": "Palestinian",
                "source": "Maknuune",
            })
    _vocab_cache = entries
    return entries


class VocabEntry(BaseModel):
    arabic: str
    romanization: str
    english: str
    pos: str = ""
    root: str = ""
    dialect: str = "Palestinian"
    source: str = ""


@router.get("/search", response_model=list[VocabEntry])
def search_vocab(
    q: str = Query(..., min_length=1, description="Search in Arabic, English, or romanization"),
    limit: int = Query(20, ge=1, le=100),
):
    """Search the Maknuune Palestinian lexicon."""
    vocab = load_maknuune()
    if not vocab:
        # Return sample entries if dataset not downloaded yet
        return _sample_entries(q)

    q_lower = q.lower()
    results = [
        entry for entry in vocab
        if (q_lower in entry["english"].lower()
            or q_lower in entry["romanization"].lower()
            or q in entry["arabic"])
    ]
    return results[:limit]


@router.get("/topic/{topic}", response_model=list[VocabEntry])
def get_topic_vocab(topic: str, limit: int = 30):
    """Get curated vocab list for a learning topic."""
    topic_words = TOPIC_VOCAB.get(topic.lower())
    if not topic_words:
        raise HTTPException(status_code=404, detail=f"Topic '{topic}' not found")
    return topic_words[:limit]


@router.get("/topics")
def list_topics():
    return {"topics": list(TOPIC_VOCAB.keys())}


def _sample_entries(q: str) -> list[VocabEntry]:
    """Return sample entries when Maknuune CSV is not available."""
    samples = [
        VocabEntry(arabic="مَرْحَبا", romanization="marhaba", english="hello", pos="interjection"),
        VocabEntry(arabic="قَهْوَة", romanization="qahwe", english="coffee", pos="noun"),
        VocabEntry(arabic="ماي", romanization="may", english="water", pos="noun"),
        VocabEntry(arabic="شُكْراً", romanization="shukran", english="thank you", pos="interjection"),
        VocabEntry(arabic="يَلَّا", romanization="yalla", english="let's go / come on", pos="interjection"),
    ]
    q_lower = q.lower()
    return [s for s in samples if q_lower in s.english.lower() or q_lower in s.romanization.lower()]


# Curated topic vocabulary lists (beginner level)
TOPIC_VOCAB: dict[str, list[VocabEntry]] = {
    "greetings": [
        VocabEntry(arabic="مَرْحَبا",          romanization="marhaba",         english="hello"),
        VocabEntry(arabic="أَهْلاً وَسَهْلاً",  romanization="ahlan wa-sahlan", english="welcome"),
        VocabEntry(arabic="كِيفَك؟",           romanization="kifak?",          english="how are you? (m)"),
        VocabEntry(arabic="كِيفِك؟",           romanization="kifik?",          english="how are you? (f)"),
        VocabEntry(arabic="مْنِيح",             romanization="mnih",            english="good / fine"),
        VocabEntry(arabic="مَعَ السَّلامَة",   romanization="ma'a s-salame",   english="goodbye"),
        VocabEntry(arabic="يَلَّا",             romanization="yalla",           english="let's go / alright"),
        VocabEntry(arabic="تَشَرَّفْنا",        romanization="tasharrafna",     english="nice to meet you"),
        VocabEntry(arabic="صَبَاح الخَيْر",    romanization="sabah il-kheir",  english="good morning"),
        VocabEntry(arabic="مَسَا الخَيْر",     romanization="masa il-kheir",   english="good evening"),
    ],
    "food": [
        VocabEntry(arabic="قَهْوَة",    romanization="qahwe",       english="coffee"),
        VocabEntry(arabic="شاي",        romanization="shai",         english="tea"),
        VocabEntry(arabic="ماي",        romanization="may",          english="water"),
        VocabEntry(arabic="عَصِير",     romanization="aseer",        english="juice"),
        VocabEntry(arabic="خُبَّز",     romanization="khubbaz",      english="bread"),
        VocabEntry(arabic="حُمُّص",     romanization="hummus",       english="hummus"),
        VocabEntry(arabic="فَلافِل",    romanization="falafel",      english="falafel"),
        VocabEntry(arabic="بَدِّي",     romanization="beddi",        english="I want"),
        VocabEntry(arabic="أَكَل",      romanization="akal",         english="food / to eat"),
        VocabEntry(arabic="لَذِيذ",     romanization="laziz",        english="delicious"),
    ],
    "directions": [
        VocabEntry(arabic="وَيْن؟",        romanization="wayn?",          english="where?"),
        VocabEntry(arabic="يَمِين",         romanization="yameen",         english="right"),
        VocabEntry(arabic="شِمَال",         romanization="shmal",          english="left"),
        VocabEntry(arabic="دُغْري",         romanization="dughri",         english="straight ahead"),
        VocabEntry(arabic="قَرِيب",         romanization="qarib",          english="near / close"),
        VocabEntry(arabic="بَعِيد",         romanization="ba'eed",         english="far"),
        VocabEntry(arabic="شارِع",          romanization="shari'",         english="street"),
        VocabEntry(arabic="دَوَّار",         romanization="dawwar",         english="roundabout"),
        VocabEntry(arabic="وَقِّفْ هُون", romanization="waqqif hoon",     english="stop here"),
        VocabEntry(arabic="رُوح عَ",       romanization="rooh 'a",        english="go to"),
    ],
    "numbers": [
        VocabEntry(arabic="وَاحَد", romanization="wahad",   english="one (1)"),
        VocabEntry(arabic="اثْنَيْن",romanization="ithnayn", english="two (2)"),
        VocabEntry(arabic="تَلاتَة",romanization="tlate",   english="three (3)"),
        VocabEntry(arabic="أَرْبَعَة",romanization="arba'a", english="four (4)"),
        VocabEntry(arabic="خَمْسَة",romanization="khamse",  english="five (5)"),
        VocabEntry(arabic="سِتَّة", romanization="sitte",   english="six (6)"),
        VocabEntry(arabic="سَبْعَة",romanization="sab'a",   english="seven (7)"),
        VocabEntry(arabic="تَمانِيَة",romanization="tmane",  english="eight (8)"),
        VocabEntry(arabic="تِسْعَة",romanization="tis'a",   english="nine (9)"),
        VocabEntry(arabic="عَشَرَة",romanization="ashara",  english="ten (10)"),
    ],
    "shopping": [
        VocabEntry(arabic="بِكَم هاد؟",   romanization="bikam haad?",    english="how much is this?"),
        VocabEntry(arabic="غَالِي",         romanization="ghali",          english="expensive"),
        VocabEntry(arabic="رَخِيص",        romanization="rakhees",        english="cheap"),
        VocabEntry(arabic="بِدِّي أَشْتِري",romanization="biddi ashtri",   english="I want to buy"),
        VocabEntry(arabic="دُكَّان",        romanization="dukkan",         english="shop / store"),
        VocabEntry(arabic="سُوق",          romanization="sooq",           english="market / souk"),
        VocabEntry(arabic="شَيْكِل",       romanization="shekel",         english="shekel (currency)"),
        VocabEntry(arabic="فُلُوس",        romanization="floos",          english="money"),
    ],
}
