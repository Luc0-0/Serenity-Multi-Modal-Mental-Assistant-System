#!/usr/bin/env python
"""Generate 7 days of varied emotion test data for user 3"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.emotion_log import EmotionLog
from app.models.user import User
from sqlalchemy import select
import random

DATABASE_URL = "postgresql+asyncpg://postgres:password@localhost/serenity"

async def generate_test_data():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get user 3
        stmt = select(User).where(User.id == 3)
        result = await session.execute(stmt)
        user = result.scalars().first()
        
        if not user:
            print("❌ User 3 not found")
            return
        
        print(f"✓ Found user: {user.username}")
        print()
        
        # Define emotion pattern for 7 days
        emotion_patterns = [
            # Day 1 (7 days ago): Mix of emotions
            {'emotion': 'joy', 'count': 3, 'confidence': 0.85},
            {'emotion': 'neutral', 'count': 2, 'confidence': 0.70},
            {'emotion': 'sadness', 'count': 1, 'confidence': 0.65},
            
            # Day 2: More neutral
            {'emotion': 'neutral', 'count': 4, 'confidence': 0.75},
            {'emotion': 'joy', 'count': 1, 'confidence': 0.80},
            
            # Day 3: Mostly sadness
            {'emotion': 'sadness', 'count': 4, 'confidence': 0.72},
            {'emotion': 'neutral', 'count': 2, 'confidence': 0.68},
            
            # Day 4: Mixed
            {'emotion': 'anger', 'count': 2, 'confidence': 0.78},
            {'emotion': 'neutral', 'count': 3, 'confidence': 0.70},
            {'emotion': 'fear', 'count': 1, 'confidence': 0.62},
            
            # Day 5: Mostly joy
            {'emotion': 'joy', 'count': 4, 'confidence': 0.87},
            {'emotion': 'neutral', 'count': 2, 'confidence': 0.72},
            
            # Day 6: Surprise and neutral
            {'emotion': 'surprise', 'count': 3, 'confidence': 0.75},
            {'emotion': 'neutral', 'count': 3, 'confidence': 0.70},
            
            # Day 7: Recent data (today and yesterday)
            # Will keep the existing data from 2026-02-16 and 2026-02-17
        ]
        
        # Calculate start date (7 days ago)
        now = datetime.utcnow()
        start_date = now - timedelta(days=6)  # Start from 6 days ago
        
        logs_created = 0
        
        for day_offset in range(6):  # Create for 6 days (today is already populated)
            current_day = start_date + timedelta(days=day_offset)
            
            # Get emotions for this day
            day_emotions = []
            if day_offset == 0:
                day_emotions = [
                    {'emotion': 'joy', 'count': 3},
                    {'emotion': 'neutral', 'count': 2},
                    {'emotion': 'sadness', 'count': 1},
                ]
            elif day_offset == 1:
                day_emotions = [
                    {'emotion': 'neutral', 'count': 4},
                    {'emotion': 'joy', 'count': 1},
                ]
            elif day_offset == 2:
                day_emotions = [
                    {'emotion': 'sadness', 'count': 4},
                    {'emotion': 'neutral', 'count': 2},
                ]
            elif day_offset == 3:
                day_emotions = [
                    {'emotion': 'anger', 'count': 2},
                    {'emotion': 'neutral', 'count': 3},
                    {'emotion': 'fear', 'count': 1},
                ]
            elif day_offset == 4:
                day_emotions = [
                    {'emotion': 'joy', 'count': 4},
                    {'emotion': 'neutral', 'count': 2},
                ]
            elif day_offset == 5:
                day_emotions = [
                    {'emotion': 'surprise', 'count': 3},
                    {'emotion': 'neutral', 'count': 3},
                ]
            
            # Create logs for this day spread throughout the day
            hour_spread = 24 // sum(e['count'] for e in day_emotions) if day_emotions else 1
            log_index = 0
            
            for emotion_data in day_emotions:
                for _ in range(emotion_data['count']):
                    log_time = current_day + timedelta(hours=log_index * hour_spread)
                    
                    log = EmotionLog(
                        user_id=user.id,
                        primary_emotion=emotion_data['emotion'],
                        confidence=random.uniform(0.65, 0.90),
                        created_at=log_time
                    )
                    session.add(log)
                    logs_created += 1
                    log_index += 1
            
            # Print what was added
            total_day = sum(e['count'] for e in day_emotions)
            print(f"Day {day_offset + 1} ({current_day.date()}): {total_day} logs")
            for emo in day_emotions:
                print(f"  • {emo['emotion']}: {emo['count']}")
        
        await session.commit()
        print()
        print(f"✓ Created {logs_created} test emotion logs")
        print()
        print("Now refresh the Insights page to see varied data across all days!")

if __name__ == "__main__":
    asyncio.run(generate_test_data())
