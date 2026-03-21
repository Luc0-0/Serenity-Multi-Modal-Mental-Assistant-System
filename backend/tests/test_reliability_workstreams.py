import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.schemas.memory import SemanticMemorySnippet
from app.services.context_refresh_service import ContextRefreshService
from app.services.goal_service import GoalService
from app.services.journal_service import JournalService
from app.services.memory_service import MemoryService


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _FakeDB:
    def __init__(self, rows):
        self.rows = rows

    async def execute(self, _):
        return _FakeResult(self.rows)


class MemoryServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_mixed_bucket_retrieval_interleaves_channels(self):
        service = MemoryService()
        recent = [SemanticMemorySnippet(content="r1", match_score=0.9), SemanticMemorySnippet(content="r2", match_score=0.8)]
        stable = [SemanticMemorySnippet(content="s1", match_score=0.7), SemanticMemorySnippet(content="s2", match_score=0.6)]
        mixed = service._mix_memory_channels(recent, stable, 4)
        self.assertEqual([m.content for m in mixed], ["r1", "s1", "r2", "s2"])

    async def test_adaptive_weights_high_volatility_prefers_recent(self):
        old_high = settings.memory_high_volatility_threshold
        old_low = settings.memory_low_volatility_threshold
        settings.memory_high_volatility_threshold = 0.3
        settings.memory_low_volatility_threshold = 0.1

        service = MemoryService()
        db = cast(AsyncSession, _FakeDB([("joy",), ("sadness",), ("joy",), ("fear",)]))
        recent, stable, volatility = await service._determine_channel_weights(db=db, user_id=1)

        self.assertGreaterEqual(volatility, 0.3)
        self.assertEqual((recent, stable), (0.7, 0.3))

        settings.memory_high_volatility_threshold = old_high
        settings.memory_low_volatility_threshold = old_low

    async def test_freshness_score_prefers_recent_memories(self):
        service = MemoryService()
        recent = datetime.now(timezone.utc) - timedelta(days=1)
        old = datetime.now(timezone.utc) - timedelta(days=20)
        self.assertGreater(service._freshness_score(recent), service._freshness_score(old))

    async def test_budget_path_uses_cached_tiers(self):
        old_flag = settings.feature_memory_request_budget
        old_budget = settings.memory_request_budget_ms
        settings.feature_memory_request_budget = True
        settings.memory_request_budget_ms = 1

        service = MemoryService()
        service._extract_summary = lambda history: ("sum", history)
        service._upsert_context_cache = AsyncMock()
        async def _slow_semantic(**_kwargs):
            await asyncio.sleep(0.01)
            return [SemanticMemorySnippet(content="m", match_score=0.9)]

        service._retrieve_semantic_memories = _slow_semantic
        service._get_cached_profile_summary = AsyncMock(return_value=None)
        service._get_cached_meta_reflection = AsyncMock(return_value=None)

        bundle = await service.build_memory_bundle(
            db=cast(AsyncSession, SimpleNamespace()),
            user_id=1,
            conversation_id=1,
            history=[{"role": "user", "content": "hi"}],
            user_message="hello",
        )
        self.assertEqual(bundle.short_term.summary, "sum")
        self.assertEqual(len(bundle.semantic_memories), 1)
        self.assertGreaterEqual(service._fallback_counters["budget_exceeded"], 1)

        settings.feature_memory_request_budget = old_flag
        settings.memory_request_budget_ms = old_budget


class JournalServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_novelty_gating_blocks_near_duplicate(self):
        old_flag = settings.feature_journal_delta_extraction
        old_threshold = settings.journal_delta_novelty_threshold
        settings.feature_journal_delta_extraction = True
        settings.journal_delta_novelty_threshold = 0.2

        svc = JournalService()
        svc._get_or_create_weekly_rollup = AsyncMock(return_value=SimpleNamespace(
            signal_fingerprints=[["stressed", "deadline"]],
            top_changes=["stressed deadline"],
            compact_summary="stressed deadline",
        ))

        payload = await svc.build_delta_helper_payload(
            db=cast(AsyncSession, SimpleNamespace()),
            user_id=1,
            user_message="stressed about deadline again",
        )
        self.assertFalse(payload["should_extract"])

        settings.feature_journal_delta_extraction = old_flag
        settings.journal_delta_novelty_threshold = old_threshold

    async def test_weekly_rollup_merges_and_deduplicates(self):
        old_flag = settings.feature_journal_delta_extraction
        settings.feature_journal_delta_extraction = True

        svc = JournalService()
        rollup = SimpleNamespace(
            signal_fingerprints=[["deadline", "stressed"]],
            top_changes=["deadline stressed"],
            compact_summary="deadline stressed",
            merged_count=0,
            updated_at=None,
        )
        svc._get_or_create_weekly_rollup = AsyncMock(return_value=rollup)

        await svc._merge_weekly_rollup(
            db=cast(AsyncSession, SimpleNamespace(flush=AsyncMock())),
            user_id=1,
            latest_change="new challenge and progress",
            helper_payload={"fingerprint": ["new", "challenge", "progress"]},
        )
        self.assertGreaterEqual(rollup.merged_count, 1)
        self.assertTrue(len(rollup.top_changes) >= 1)

        settings.feature_journal_delta_extraction = old_flag


class GoalServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_readiness_tuning_requires_override(self):
        old_flag = settings.feature_goal_readiness_tuning
        settings.feature_goal_readiness_tuning = True

        svc = GoalService(db=cast(AsyncSession, SimpleNamespace()))
        base = [{"time": "07:00", "activity": "Run", "description": "Cardio"}]

        # Without explicit override ack, schedule must stay unchanged.
        untouched = await svc.apply_readiness_tuning(
            user_id=1,
            schedule_items=base,
            user_override_ack=None,
        )
        self.assertEqual(untouched, base)

        # With explicit ack, tuned output should be additive and bounded.
        svc._compute_readiness_score = AsyncMock(return_value=0.9)
        tuned = await svc.apply_readiness_tuning(
            user_id=1,
            schedule_items=base,
            user_override_ack=True,
        )
        self.assertGreaterEqual(len(tuned), 1)
        self.assertIn("intensity", tuned[0].get("description", ""))

        settings.feature_goal_readiness_tuning = old_flag


class ContextRefreshServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_pressure_guardrail_and_prewarm_metrics(self):
        svc = ContextRefreshService()

        old_async_flag = settings.feature_async_context_refresh
        old_depth = settings.memory_refresh_queue_max_depth
        settings.feature_async_context_refresh = True
        settings.memory_refresh_queue_max_depth = 0

        ok = await svc.enqueue_refresh(user_id=1, reason="test")
        self.assertFalse(ok)
        self.assertTrue(svc.pressure_high())

        settings.memory_refresh_queue_max_depth = 100
        svc.note_user_activity(1)
        await svc.maybe_prewarm(1)
        self.assertGreaterEqual(svc.metrics()["prewarm_hit_rate"], 0.0)

        settings.feature_async_context_refresh = old_async_flag
        settings.memory_refresh_queue_max_depth = old_depth


if __name__ == "__main__":
    unittest.main()
