"""
Tests for the SRS (Spaced Repetition System) implementation
Run: pytest tests/test_srs.py -v
"""

import pytest
from datetime import datetime, timedelta
from services.srs import SRSCard, SRSScheduler, card_to_dict, card_from_dict


def make_card(word_id: str = "test_001", **kwargs) -> SRSCard:
    return SRSCard(
        word_id=word_id,
        arabic="مَرْحَبا",
        romanization="marhaba",
        english="Hello",
        lesson_id="greetings_001",
        **kwargs,
    )


class TestSRSCard:

    def test_new_card_defaults(self):
        card = make_card()
        assert card.repetitions == 0
        assert card.ease_factor == 2.5
        assert card.interval == 1
        assert card.total_reviews == 0
        assert card.accuracy == 0.0

    def test_easy_response_increases_interval(self):
        card = make_card()
        result = card.review("easy")
        assert card.repetitions == 1
        assert card.interval == 1
        assert card.ease_factor > 2.5      # ease increases on "easy"
        assert result["interval_days"] == 1

    def test_second_review_good(self):
        card = make_card(repetitions=1, interval=1, ease_factor=2.5)
        card.review("good")
        assert card.interval == 6
        assert card.repetitions == 2

    def test_third_review_compounds(self):
        card = make_card(repetitions=2, interval=6, ease_factor=2.5)
        card.review("good")
        assert card.interval == pytest.approx(6 * 2.5, abs=1)

    def test_hard_resets_repetitions(self):
        card = make_card(repetitions=3, interval=21, ease_factor=2.5)
        card.review("hard")
        assert card.repetitions == 0
        assert card.interval == 1

    def test_ease_factor_min_bound(self):
        card = make_card(ease_factor=1.4)
        for _ in range(5):
            card.review("hard")
        assert card.ease_factor >= 1.3   # never below minimum

    def test_accuracy_tracking(self):
        card = make_card()
        card.review("good")   # correct
        card.review("good")   # correct
        card.review("hard")   # wrong
        assert card.total_reviews == 3
        assert card.correct_reviews == 2
        assert card.accuracy == pytest.approx(2/3, abs=0.01)

    def test_is_due(self):
        card = make_card()
        card.next_review = datetime.utcnow() - timedelta(hours=1)
        assert card.is_due

        card.next_review = datetime.utcnow() + timedelta(days=1)
        assert not card.is_due

    def test_serialization_roundtrip(self):
        card = make_card(repetitions=3, ease_factor=2.3, interval=14)
        card.review("good")
        d = card_to_dict(card)
        restored = card_from_dict(d)
        assert restored.word_id == card.word_id
        assert restored.ease_factor == card.ease_factor
        assert restored.interval == card.interval
        assert restored.next_review.date() == card.next_review.date()


class TestSRSScheduler:

    def make_scheduler(self, n: int = 5) -> SRSScheduler:
        cards = [make_card(f"word_{i}", total_reviews=i % 2) for i in range(n)]
        # Make some cards due
        for card in cards[:3]:
            card.next_review = datetime.utcnow() - timedelta(hours=1)
        return SRSScheduler(cards)

    def test_due_cards_count(self):
        scheduler = self.make_scheduler(5)
        due = scheduler.due_cards()
        assert len(due) == 3

    def test_due_cards_limit(self):
        scheduler = self.make_scheduler(5)
        due = scheduler.due_cards(limit=2)
        assert len(due) == 2

    def test_stats(self):
        scheduler = self.make_scheduler(5)
        stats = scheduler.stats()
        assert stats["total_cards"] == 5
        assert stats["due_today"] == 3

    def test_review_card(self):
        scheduler = self.make_scheduler(3)
        result = scheduler.review_card("word_0", "good")
        assert "interval_days" in result
        assert "next_review" in result
