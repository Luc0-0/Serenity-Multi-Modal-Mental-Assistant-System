#
# Copyright (c) 2026 Nipun Sujesh. All rights reserved.
# Licensed under the AGPLv3. See LICENSE file in the project root for details.
#
# This software is the confidential and proprietary information of Nipun Sujesh.
#

import json
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.models import Goal, GoalPhase, DailySchedule, DailyLog, PhaseTask, WeeklyReview, StreakFreeze


class GoalService:
    """Business logic for goal management."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_goal(
        self,
        user_id: int,
        title: str,
        description: str,
        theme: str,
        duration_days: int,
        start_date: date,
        schedule_items: List[Dict],
        phases_data: Optional[List[Dict]] = None,
        answers_json: Optional[str] = None
    ) -> Goal:
        """Create a new goal with schedule and phases."""

        goal = Goal(
            user_id=user_id,
            title=title,
            description=description,
            theme=theme,
            duration_days=duration_days,
            start_date=start_date,
            answers_json=answers_json
        )
        self.db.add(goal)
        await self.db.flush()

        # Create schedule items
        for idx, item in enumerate(schedule_items):
            schedule_item = DailySchedule(
                goal_id=goal.id,
                time=item["time"],
                activity=item["activity"],
                description=item.get("description", ""),
                tags=json.dumps(item.get("tags", [])),
                sort_order=item.get("sort_order", idx)
            )
            self.db.add(schedule_item)

        # Create phases — personalized if available, defaults otherwise
        if phases_data:
            await self._create_phases_from_llm(goal.id, phases_data)
        else:
            await self._create_default_phases(goal.id, theme)

        await self.db.commit()
        return goal

    async def _create_phases_from_llm(self, goal_id: int, phases_data: List[Dict]):
        """Create phases, domains, and tasks from LLM-generated data."""

        for phase_data in phases_data:
            phase = GoalPhase(
                goal_id=goal_id,
                phase_number=phase_data.get("phase_number", 0),
                title=phase_data.get("title", "Phase"),
                description=phase_data.get("description", ""),
                unlock_streak_required=phase_data.get("unlock_streak_required", 0),
                is_unlocked=phase_data.get("phase_number", 0) == 0
            )
            self.db.add(phase)
            await self.db.flush()

            for domain in phase_data.get("domains", []):
                domain_name = domain.get("name", "General")
                for task_data in domain.get("tasks", []):
                    subtasks = task_data.get("subtasks", [])
                    if subtasks and isinstance(subtasks[0], dict):
                        subtasks = [s.get("title", str(s)) for s in subtasks]

                    task = PhaseTask(
                        phase_id=phase.id,
                        domain_name=domain_name,
                        task_title=task_data.get("title", "Task"),
                        subtasks=json.dumps(subtasks)
                    )
                    self.db.add(task)

    async def _create_default_phases(self, goal_id: int, theme: str):
        """Create 3 default phases for the goal."""

        phase_configs = {
            "tactical": [
                {
                    "phase_number": 0,
                    "title": "Foundation Phase",
                    "description": "Establish core disciplines and tactical routines",
                    "unlock_streak_required": 0,
                    "is_unlocked": True,
                    "domains": [
                        {"name": "Physical", "color": "#E53E3E"},
                        {"name": "Mental", "color": "#3182CE"},
                        {"name": "Tactical", "color": "#38A169"}
                    ]
                },
                {
                    "phase_number": 1,
                    "title": "Acceleration Phase",
                    "description": "Intensify operations and expand capabilities",
                    "unlock_streak_required": 14,
                    "is_unlocked": False,
                    "domains": [
                        {"name": "Advanced Skills", "color": "#D69E2E"},
                        {"name": "Leadership", "color": "#9F7AEA"},
                        {"name": "Strategic", "color": "#F56565"}
                    ]
                },
                {
                    "phase_number": 2,
                    "title": "Mastery Phase",
                    "description": "Elite performance and mission completion",
                    "unlock_streak_required": 42,
                    "is_unlocked": False,
                    "domains": [
                        {"name": "Mastery", "color": "#C53030"},
                        {"name": "Innovation", "color": "#2B6CB0"},
                        {"name": "Legacy", "color": "#2F855A"}
                    ]
                }
            ],
            "balanced": [
                {
                    "phase_number": 0,
                    "title": "Foundation",
                    "description": "Build sustainable habits and gentle progress",
                    "unlock_streak_required": 0,
                    "is_unlocked": True,
                    "domains": [
                        {"name": "Wellness", "color": "#48BB78"},
                        {"name": "Growth", "color": "#4299E1"},
                        {"name": "Connection", "color": "#ED8936"}
                    ]
                },
                {
                    "phase_number": 1,
                    "title": "Expansion",
                    "description": "Deepen practice and broaden impact",
                    "unlock_streak_required": 14,
                    "is_unlocked": False,
                    "domains": [
                        {"name": "Mastery", "color": "#9F7AEA"},
                        {"name": "Service", "color": "#38B2AC"},
                        {"name": "Expression", "color": "#F687B3"}
                    ]
                },
                {
                    "phase_number": 2,
                    "title": "Integration",
                    "description": "Embody transformation and inspire others",
                    "unlock_streak_required": 42,
                    "is_unlocked": False,
                    "domains": [
                        {"name": "Wisdom", "color": "#805AD5"},
                        {"name": "Impact", "color": "#D53F8C"},
                        {"name": "Legacy", "color": "#319795"}
                    ]
                }
            ]
        }

        config = phase_configs.get(theme, phase_configs["balanced"])

        for phase_config in config:
            phase = GoalPhase(
                goal_id=goal_id,
                phase_number=phase_config["phase_number"],
                title=phase_config["title"],
                description=phase_config["description"],
                unlock_streak_required=phase_config["unlock_streak_required"],
                is_unlocked=phase_config["is_unlocked"]
            )
            self.db.add(phase)
            await self.db.flush()

            for domain in phase_config["domains"]:
                for i in range(2):
                    task = PhaseTask(
                        phase_id=phase.id,
                        domain_name=domain["name"],
                        task_title=f"Complete {domain['name'].lower()} milestone {i+1}",
                        subtasks=json.dumps([
                            "Research and plan approach",
                            "Execute primary action",
                            "Document and reflect"
                        ])
                    )
                    self.db.add(task)

    async def update_streak(self, goal_id: int, user_id: int):
        """Update goal streak based on completion."""

        result = await self.db.execute(
            select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
        )
        goal = result.scalar_one_or_none()
        if not goal:
            return

        today = date.today()
        yesterday = today - timedelta(days=1)

        today_log_result = await self.db.execute(
            select(DailyLog).where(
                DailyLog.goal_id == goal_id,
                DailyLog.user_id == user_id,
                DailyLog.date == today
            )
        )
        today_log = today_log_result.scalar_one_or_none()

        yesterday_log_result = await self.db.execute(
            select(DailyLog).where(
                DailyLog.goal_id == goal_id,
                DailyLog.user_id == user_id,
                DailyLog.date == yesterday
            )
        )
        yesterday_log = yesterday_log_result.scalar_one_or_none()

        yesterday_freeze_result = await self.db.execute(
            select(StreakFreeze).where(
                StreakFreeze.goal_id == goal_id,
                StreakFreeze.user_id == user_id,
                StreakFreeze.used_date == yesterday
            )
        )
        yesterday_freeze = yesterday_freeze_result.scalar_one_or_none()

        is_today_complete = (
            today_log and today_log.completion_percentage >= 80
        ) or await self._has_freeze_today(goal_id, user_id)

        was_yesterday_complete = (
            yesterday_log and yesterday_log.completion_percentage >= 80
        ) or yesterday_freeze is not None

        if is_today_complete:
            if was_yesterday_complete:
                goal.current_streak += 1
            else:
                goal.current_streak = 1

            goal.total_completed_days = (goal.total_completed_days or 0) + 1
            goal.longest_streak = max(goal.longest_streak, goal.current_streak)
            goal.freezes_available = goal.current_streak // 14

            await self._check_phase_unlocks(goal_id, goal.current_streak)

        await self.db.commit()

    async def _has_freeze_today(self, goal_id: int, user_id: int) -> bool:
        """Check if user used freeze today."""
        today = date.today()
        result = await self.db.execute(
            select(StreakFreeze).where(
                StreakFreeze.goal_id == goal_id,
                StreakFreeze.user_id == user_id,
                StreakFreeze.used_date == today
            )
        )
        return result.scalar_one_or_none() is not None

    async def _check_phase_unlocks(self, goal_id: int, current_streak: int):
        """Check and unlock phases based on streak."""
        result = await self.db.execute(
            select(GoalPhase).where(
                GoalPhase.goal_id == goal_id,
                GoalPhase.unlock_streak_required <= current_streak,
                GoalPhase.is_unlocked == False
            )
        )
        phases = result.scalars().all()

        for phase in phases:
            phase.is_unlocked = True

    async def use_streak_freeze(self, goal_id: int, user_id: int) -> bool:
        """Use a streak freeze for today."""

        result = await self.db.execute(
            select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
        )
        goal = result.scalar_one_or_none()
        if not goal or goal.freezes_available <= 0:
            return False

        today = date.today()
        existing_result = await self.db.execute(
            select(StreakFreeze).where(
                StreakFreeze.goal_id == goal_id,
                StreakFreeze.user_id == user_id,
                StreakFreeze.used_date == today
            )
        )
        if existing_result.scalar_one_or_none():
            return False

        freeze = StreakFreeze(
            user_id=user_id,
            goal_id=goal_id,
            used_date=today
        )
        self.db.add(freeze)
        goal.freezes_available -= 1

        today_log_result = await self.db.execute(
            select(DailyLog).where(
                DailyLog.goal_id == goal_id,
                DailyLog.user_id == user_id,
                DailyLog.date == today
            )
        )
        today_log = today_log_result.scalar_one_or_none()

        if today_log:
            today_log.is_frozen = True
        else:
            today_log = DailyLog(
                user_id=user_id,
                goal_id=goal_id,
                date=today,
                is_frozen=True,
                completion_percentage=100
            )
            self.db.add(today_log)

        await self.db.commit()
        return True

    async def get_goal_with_details(self, goal_id: int, user_id: int) -> Optional[Dict]:
        """Get goal with all related data."""

        goal_result = await self.db.execute(
            select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
        )
        goal = goal_result.scalar_one_or_none()
        if not goal:
            return None

        schedule_result = await self.db.execute(
            select(DailySchedule).where(
                DailySchedule.goal_id == goal_id
            ).order_by(DailySchedule.sort_order)
        )
        schedule = schedule_result.scalars().all()

        phases_result = await self.db.execute(
            select(GoalPhase).where(
                GoalPhase.goal_id == goal_id
            ).order_by(GoalPhase.phase_number)
        )
        phases = phases_result.scalars().all()

        recent_logs_result = await self.db.execute(
            select(DailyLog).where(
                DailyLog.goal_id == goal_id,
                DailyLog.user_id == user_id,
                DailyLog.date >= date.today() - timedelta(days=30)
            ).order_by(DailyLog.date.desc())
        )
        recent_logs = recent_logs_result.scalars().all()

        return {
            "goal": goal,
            "schedule": schedule,
            "phases": phases,
            "recent_logs": recent_logs,
            "freeze_used_today": await self._has_freeze_today(goal_id, user_id)
        }

    async def get_analytics(self, goal_id: int, user_id: int) -> Dict:
        """Get goal analytics and insights."""

        goal_result = await self.db.execute(
            select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
        )
        goal = goal_result.scalar_one_or_none()
        if not goal:
            return {}

        total_days = (date.today() - goal.start_date).days + 1
        logs_result = await self.db.execute(
            select(DailyLog).where(
                DailyLog.goal_id == goal_id,
                DailyLog.user_id == user_id
            )
        )
        logs = logs_result.scalars().all()

        completed_days = len([log for log in logs if log.completion_percentage >= 80])
        avg_completion = sum(log.completion_percentage for log in logs) / len(logs) if logs else 0

        return {
            "total_days": total_days,
            "completed_days": completed_days,
            "completion_rate": completed_days / total_days if total_days > 0 else 0,
            "average_completion": avg_completion,
            "current_streak": goal.current_streak,
            "longest_streak": goal.longest_streak,
            "days_to_next_phase": await self._days_to_next_phase(goal_id, goal.current_streak),
            "consistency_score": self._calculate_consistency_score(logs)
        }

    async def _days_to_next_phase(self, goal_id: int, current_streak: int) -> Optional[int]:
        """Calculate days needed to unlock next phase."""

        result = await self.db.execute(
            select(GoalPhase).where(
                GoalPhase.goal_id == goal_id,
                GoalPhase.unlock_streak_required > current_streak,
                GoalPhase.is_unlocked == False
            ).order_by(GoalPhase.unlock_streak_required)
        )
        next_phase = result.scalar_one_or_none()

        if next_phase:
            return next_phase.unlock_streak_required - current_streak
        return None

    def _calculate_consistency_score(self, logs: List) -> float:
        """Calculate consistency score (0-100) based on recent performance."""

        if not logs:
            return 0

        recent_logs = sorted(logs, key=lambda x: x.date, reverse=True)[:14]

        if not recent_logs:
            return 0

        total_score = 0
        total_weight = 0

        for i, log in enumerate(recent_logs):
            weight = 1.0 - (i * 0.05)
            score = min(log.completion_percentage / 100.0, 1.0)
            total_score += score * weight
            total_weight += weight

        return (total_score / total_weight * 100) if total_weight > 0 else 0
