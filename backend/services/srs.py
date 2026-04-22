"""
Spaced Repetition System (SRS)
Implementation of the SM-2 algorithm (SuperMemo 2)
Used in Anki, Duolingo, and most modern language learning apps.

How it works:
  - Each word card has: ease_factor, interval (days), repetitions
  - After each review, user rates recall quality 0–4 (mapped from 4-button UI)
  - Algorithm adjusts next review interval based on ease
  - New cards: 1 day → 6 days → then exponential growth
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Literal
import math

Quality = Literal[0, 1, 2, 3, 4, 5]
# 0 = complete blackout (reset)
# 1 = incorrect (Hard button)
# 2 = incorrect but recalled (OK button)
# 3 = correct with difficulty (Good button)
# 4 = correct easily (Easy button)
# 5 = perfect response

# UI button → SM2 quality mapping
BUTTON_TO_QUALITY: dict[str, Quality] = {
    "hard":  1,
    "ok":    3,
    "good":  4,
    "easy":  5,
}


@dataclass
class SRSCard:
    word_id: str
    arabic: str
    romanization: str
    english: str
    lesson_id: str

    # SM-2 fields
    repetitions: int = 0
    ease_factor: float = 2.5       # Starts at 2.5, minimum 1.3
    interval: int = 1              # Days until next review
    next_review: datetime = field(default_factory=datetime.utcnow)
    total_reviews: int = 0
    correct_reviews: int = 0

    @property
    def accuracy(self) -> float:
        if self.total_reviews == 0:
            return 0.0
        return self.correct_reviews / self.total_reviews

    @property
    def is_due(self) -> bool:
        return datetime.utcnow() >= self.next_review

    def review(self, button: str) -> dict:
        """
        Process a review response and return updated card state.
        button: "hard" | "ok" | "good" | "easy"
        """
        quality = BUTTON_TO_QUALITY.get(button, 3)
        self.total_reviews += 1
        if quality >= 3:
            self.correct_reviews += 1

        # SM-2 algorithm
        if quality < 3:
            # Incorrect — reset repetitions but keep ease
            self.repetitions = 0
            self.interval = 1
        else:
            if self.repetitions == 0:
                self.interval = 1
            elif self.repetitions == 1:
                self.interval = 6
            else:
                self.interval = round(self.interval * self.ease_factor)
            self.repetitions += 1

        # Update ease factor
        self.ease_factor = max(
            1.3,
            self.ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
        )

        # Schedule next review
        self.next_review = datetime.utcnow() + timedelta(days=self.interval)

        return {
            "word_id": self.word_id,
            "interval_days": self.interval,
            "ease_factor": round(self.ease_factor, 2),
            "next_review": self.next_review.isoformat(),
            "repetitions": self.repetitions,
        }


class SRSScheduler:
    """Manages a user's full deck of SRS cards."""

    def __init__(self, cards: list[SRSCard]):
        self.cards = {card.word_id: card for card in cards}

    def due_cards(self, limit: int = 20) -> list[SRSCard]:
        """Return cards due for review, oldest first."""
        due = [c for c in self.cards.values() if c.is_due]
        due.sort(key=lambda c: c.next_review)
        return due[:limit]

    def new_cards(self, limit: int = 5) -> list[SRSCard]:
        """Return cards that have never been reviewed."""
        new = [c for c in self.cards.values() if c.total_reviews == 0]
        return new[:limit]

    def add_card(self, card: SRSCard):
        self.cards[card.word_id] = card

    def review_card(self, word_id: str, button: str) -> dict:
        card = self.cards.get(word_id)
        if not card:
            raise ValueError(f"Card '{word_id}' not found")
        return card.review(button)

    def stats(self) -> dict:
        all_cards = list(self.cards.values())
        return {
            "total_cards": len(all_cards),
            "due_today": len(self.due_cards()),
            "new_cards": len([c for c in all_cards if c.total_reviews == 0]),
            "learning": len([c for c in all_cards if 0 < c.repetitions < 3]),
            "mature": len([c for c in all_cards if c.repetitions >= 3]),
            "average_accuracy": round(
                sum(c.accuracy for c in all_cards if c.total_reviews > 0)
                / max(1, len([c for c in all_cards if c.total_reviews > 0])),
                2
            ),
        }


# --- Serialization helpers for PostgreSQL/JSON storage ---

def card_to_dict(card: SRSCard) -> dict:
    return {
        "word_id": card.word_id,
        "arabic": card.arabic,
        "romanization": card.romanization,
        "english": card.english,
        "lesson_id": card.lesson_id,
        "repetitions": card.repetitions,
        "ease_factor": card.ease_factor,
        "interval": card.interval,
        "next_review": card.next_review.isoformat(),
        "total_reviews": card.total_reviews,
        "correct_reviews": card.correct_reviews,
    }


def card_from_dict(data: dict) -> SRSCard:
    return SRSCard(
        word_id=data["word_id"],
        arabic=data["arabic"],
        romanization=data["romanization"],
        english=data["english"],
        lesson_id=data["lesson_id"],
        repetitions=data.get("repetitions", 0),
        ease_factor=data.get("ease_factor", 2.5),
        interval=data.get("interval", 1),
        next_review=datetime.fromisoformat(data.get("next_review", datetime.utcnow().isoformat())),
        total_reviews=data.get("total_reviews", 0),
        correct_reviews=data.get("correct_reviews", 0),
    )
