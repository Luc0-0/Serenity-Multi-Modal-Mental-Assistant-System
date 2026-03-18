#
# Copyright (c) 2026 Nipun Sujesh. All rights reserved.
# Licensed under the AGPLv3. See LICENSE file in the project root for details.
#
# This software is the confidential and proprietary information of Nipun Sujesh.
#

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
import json

from app.db.connection import get_db
from app.core.auth import get_current_user
from app.models import User, Goal, GoalPhase, DailySchedule, DailyLog, PhaseTask, WeeklyReview, StreakFreeze
from app.services.goal_service import GoalService
from app.services.llm_schedule_service import LLMScheduleService
from app.services.ai_questions_service import AIQuestionsService

router = APIRouter(prefix="/api/goals", tags=["goals"])


# AI Question Generation
@router.post("/generate-questions")
async def generate_questions(
    request_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Generate personalized AI questions for goal setup."""
    ai_service = AIQuestionsService()

    try:
        questions = await ai_service.generate_questions(
            goal_title=request_data.get("title", ""),
            goal_description=request_data.get("description", ""),
            theme=request_data.get("theme", "balanced")
        )

        return {"categories": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")


@router.post("/generate-schedule-from-answers")
async def generate_schedule_from_answers(
    request_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Generate daily schedule and phases from AI question answers."""
    ai_service = AIQuestionsService()

    try:
        result = await ai_service.generate_schedule_and_phases(
            goal_title=request_data.get("title", ""),
            goal_description=request_data.get("description", ""),
            theme=request_data.get("theme", "balanced"),
            duration_days=request_data.get("duration_days", 180),
            answers=request_data.get("answers", {})
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Schedule generation failed: {str(e)}")


# Goal Management
@router.post("/")
async def create_goal(
    goal_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new goal with LLM-generated schedule."""
    goal_service = GoalService(db)
    llm_service = LLMScheduleService()

    # Generate optimized schedule via LLM
    schedule_items = await llm_service.generate_schedule(
        goal_title=goal_data["title"],
        goal_description=goal_data["description"],
        duration_days=goal_data.get("duration_days", 180),
        theme=goal_data.get("theme", "balanced")
    )

    goal = goal_service.create_goal(
        user_id=current_user.id,
        title=goal_data["title"],
        description=goal_data["description"],
        theme=goal_data.get("theme", "balanced"),
        duration_days=goal_data.get("duration_days", 180),
        start_date=date.today(),
        schedule_items=schedule_items
    )

    return {"goal_id": goal.id, "message": "Goal created successfully"}


@router.get("/")
async def get_user_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all goals for the current user."""
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    return goals


@router.get("/{goal_id}")
async def get_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific goal with all related data."""
    goal_service = GoalService(db)
    goal = goal_service.get_goal_with_details(goal_id, current_user.id)

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return goal


@router.put("/{goal_id}")
async def update_goal(
    goal_id: int,
    goal_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update goal details."""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    for key, value in goal_data.items():
        setattr(goal, key, value)

    db.commit()
    return {"message": "Goal updated successfully"}


# Daily Schedule
@router.get("/{goal_id}/schedule")
async def get_schedule(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get daily schedule for a goal."""
    schedule = db.query(DailySchedule).filter(
        DailySchedule.goal_id == goal_id
    ).order_by(DailySchedule.sort_order).all()

    return schedule


@router.post("/{goal_id}/schedule")
async def create_schedule_item(
    goal_id: int,
    schedule_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add new schedule item."""
    schedule_item = DailySchedule(
        goal_id=goal_id,
        time=schedule_data["time"],
        activity=schedule_data["activity"],
        description=schedule_data.get("description"),
        tags=json.dumps(schedule_data.get("tags", [])),
        sort_order=schedule_data.get("sort_order", 0)
    )

    db.add(schedule_item)
    db.commit()
    return {"message": "Schedule item created"}


# Daily Logging
@router.get("/{goal_id}/logs")
async def get_daily_logs(
    goal_id: int,
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get daily completion logs."""
    start_date = date.today() - timedelta(days=days)

    logs = db.query(DailyLog).filter(
        DailyLog.goal_id == goal_id,
        DailyLog.user_id == current_user.id,
        DailyLog.date >= start_date
    ).order_by(DailyLog.date.desc()).all()

    return logs


@router.post("/{goal_id}/logs")
async def log_daily_completion(
    goal_id: int,
    log_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log today's completion."""
    goal_service = GoalService(db)

    # Update or create today's log
    today = date.today()
    existing_log = db.query(DailyLog).filter(
        DailyLog.goal_id == goal_id,
        DailyLog.user_id == current_user.id,
        DailyLog.date == today
    ).first()

    if existing_log:
        existing_log.completed_items = json.dumps(log_data["completed_items"])
        existing_log.completion_percentage = log_data.get("completion_percentage", 0)
    else:
        daily_log = DailyLog(
            user_id=current_user.id,
            goal_id=goal_id,
            date=today,
            completed_items=json.dumps(log_data["completed_items"]),
            completion_percentage=log_data.get("completion_percentage", 0)
        )
        db.add(daily_log)

    # Update streak
    goal_service.update_streak(goal_id, current_user.id)

    db.commit()
    return {"message": "Daily log updated"}


# Streak Management
@router.post("/{goal_id}/freeze")
async def use_streak_freeze(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Use a streak freeze for today."""
    goal_service = GoalService(db)

    success = goal_service.use_streak_freeze(goal_id, current_user.id)

    if not success:
        raise HTTPException(status_code=400, detail="No freezes available or already used today")

    return {"message": "Streak freeze applied"}


# Phase Management
@router.get("/{goal_id}/phases")
async def get_phases(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get goal phases with unlock status."""
    phases = db.query(GoalPhase).filter(GoalPhase.goal_id == goal_id).order_by(GoalPhase.phase_number).all()
    return phases


@router.post("/{goal_id}/phases/{phase_id}/tasks/{task_id}/complete")
async def toggle_phase_task(
    goal_id: int,
    phase_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle completion of a phase task."""
    task = db.query(PhaseTask).filter(PhaseTask.id == task_id, PhaseTask.phase_id == phase_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_completed = not task.is_completed
    task.completed_at = datetime.now() if task.is_completed else None

    db.commit()
    return {"message": "Task toggled"}


# Weekly Reviews
@router.get("/{goal_id}/reviews")
async def get_weekly_reviews(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get weekly reviews for a goal."""
    reviews = db.query(WeeklyReview).filter(
        WeeklyReview.goal_id == goal_id,
        WeeklyReview.user_id == current_user.id
    ).order_by(WeeklyReview.week_start_date.desc()).all()

    return reviews


@router.post("/{goal_id}/reviews")
async def submit_weekly_review(
    goal_id: int,
    review_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit weekly review."""
    # Get start of current week (Sunday)
    today = date.today()
    days_since_sunday = today.weekday() + 1 if today.weekday() != 6 else 0
    week_start = today - timedelta(days=days_since_sunday)

    # Check if review already exists for this week
    existing = db.query(WeeklyReview).filter(
        WeeklyReview.goal_id == goal_id,
        WeeklyReview.user_id == current_user.id,
        WeeklyReview.week_start_date == week_start
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Review already submitted for this week")

    review = WeeklyReview(
        user_id=current_user.id,
        goal_id=goal_id,
        week_start_date=week_start,
        answers=json.dumps(review_data["answers"])
    )

    db.add(review)
    db.commit()
    return {"message": "Weekly review submitted"}


# Analytics
@router.get("/{goal_id}/analytics")
async def get_goal_analytics(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get goal analytics and insights."""
    goal_service = GoalService(db)
    analytics = goal_service.get_analytics(goal_id, current_user.id)
    return analytics