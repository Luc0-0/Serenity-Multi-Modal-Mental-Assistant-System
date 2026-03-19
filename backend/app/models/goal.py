#
# Copyright (c) 2026 Nipun Sujesh. All rights reserved.
# Licensed under the AGPLv3. See LICENSE file in the project root for details.
#
# This software is the confidential and proprietary information of Nipun Sujesh.
#

from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db.base import Base


class Goal(Base):
    """User goal/plan model."""
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    theme = Column(String(50), default="balanced")  # tactical, gentle, balanced
    duration_days = Column(Integer, default=180)
    start_date = Column(Date, nullable=False)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    freezes_available = Column(Integer, default=0)
    total_completed_days = Column(Integer, default=0)
    answers_json = Column(Text, nullable=True)  # JSON: onboarding answers for LLM re-use
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class GoalPhase(Base):
    """Phase within a goal (unlocked by streak milestones)."""
    __tablename__ = "goal_phases"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True)
    phase_number = Column(Integer, nullable=False)  # 0, 1, 2
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    unlock_streak_required = Column(Integer, default=0)  # 0, 14, 42
    is_unlocked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DailySchedule(Base):
    """Daily schedule item for a goal."""
    __tablename__ = "daily_schedules"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True)
    time = Column(String(10), nullable=False)  # HH:MM format
    activity = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # JSON array as string
    sort_order = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DailyLog(Base):
    """Daily completion tracking."""
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    completed_items = Column(Text, nullable=True)  # JSON object as string
    is_frozen = Column(Boolean, default=False)
    completion_percentage = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PhaseTask(Base):
    """Task within a phase domain."""
    __tablename__ = "phase_tasks"

    id = Column(Integer, primary_key=True, index=True)
    phase_id = Column(Integer, ForeignKey("goal_phases.id", ondelete="CASCADE"), nullable=False, index=True)
    domain_name = Column(String(100), nullable=False)  # Technical, Physical, Mental, etc.
    task_title = Column(String(255), nullable=False)
    subtasks = Column(Text, nullable=True)  # JSON array as string
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WeeklyReview(Base):
    """Weekly reflection/review."""
    __tablename__ = "weekly_reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True)
    week_start_date = Column(Date, nullable=False, index=True)
    answers = Column(Text, nullable=False)  # JSON object as string
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StreakFreeze(Base):
    """Streak freeze usage tracking."""
    __tablename__ = "streak_freezes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True)
    used_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
