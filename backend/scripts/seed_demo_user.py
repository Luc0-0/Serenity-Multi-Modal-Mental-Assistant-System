#!/usr/bin/env python3
"""
Seed a realistic demo user (Alex Morgan) complete with backdated
conversations, emotion logs, and journal entries so the frontend can be
tested end-to-end.
"""

import argparse
import asyncio
import sys
from datetime import datetime, timedelta

from argon2 import PasswordHasher
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.append(str((__file__).rsplit("\\scripts", 1)[0]))

from app.core.config import settings  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.conversation import Conversation  # noqa: E402
from app.models.message import Message, MessageRole  # noqa: E402
from app.models.emotion_log import EmotionLog  # noqa: E402
from app.models.journal_entry import JournalEntry  # noqa: E402
from app.models.memory import (
    SemanticMemory,
    EmotionalProfile,
    MetaReflection,
    ConversationContextCache,
)  # noqa: E402
from app.services.memory_service import memory_service  # noqa: E402


async def ensure_user(session: AsyncSession, *, name: str, email: str, password: str) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        return user

    hashed = PasswordHasher().hash(password)
    user = User(
        name=name,
        username=email.split("@")[0].replace(".", "_"),
        email=email,
        hashed_password=hashed,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    return user


async def clear_user_data(session: AsyncSession, *, user_id: int) -> None:
    conversation_ids = (
        await session.execute(
            select(Conversation.id).where(Conversation.user_id == user_id)
        )
    ).scalars().all()

    if conversation_ids:
        await session.execute(
            delete(Message).where(Message.conversation_id.in_(conversation_ids))
        )
        await session.execute(
            delete(EmotionLog).where(EmotionLog.conversation_id.in_(conversation_ids))
        )
        await session.execute(
            delete(SemanticMemory).where(SemanticMemory.conversation_id.in_(conversation_ids))
        )
        await session.execute(
            delete(ConversationContextCache).where(
                ConversationContextCache.conversation_id.in_(conversation_ids)
            )
        )
        await session.execute(
            delete(Conversation).where(Conversation.id.in_(conversation_ids))
        )

    await session.execute(delete(JournalEntry).where(JournalEntry.user_id == user_id))
    await session.execute(delete(SemanticMemory).where(SemanticMemory.user_id == user_id))
    await session.execute(
        delete(EmotionalProfile).where(EmotionalProfile.user_id == user_id)
    )
    await session.execute(
        delete(MetaReflection).where(MetaReflection.user_id == user_id)
    )


def scenario_alex(now):
    base = now - timedelta(days=14)
    turns = [
        {
            "timestamp": base,
            "user": "I always feel worthless before exams and my sleep disappears.",
            "assistant": "That sounds exhausting. When does that feeling usually hit the hardest?",
            "emotion": "sadness",
        },
        {
            "timestamp": base + timedelta(days=3),
            "user": "Three nights in a row without sleep. I'm spiraling.",
            "assistant": "Let's slow it down. What's one gentle thing you can do before bed tonight?",
            "emotion": "fear",
        },
        {
            "timestamp": base + timedelta(days=7),
            "user": "Journaling helped for a day but the fog came back.",
            "assistant": "It's still progress. What did journaling reveal that surprised you?",
            "emotion": "neutral",
        },
        {
            "timestamp": base + timedelta(days=10),
            "user": "I actually tried a walk and felt present for once.",
            "assistant": "That matters. Can we plan tiny walks when the anxiety sparks?",
            "emotion": "joy",
        },
        {
            "timestamp": base + timedelta(days=13),
            "user": "Exams tomorrow. Nervous but not hopeless.",
            "assistant": "That's growth. Let's map out how you'll support yourself tomorrow morning.",
            "emotion": "anxious",
        },
    ]
    plan = {
        "title": "Settling the fog",
        "timestamp": turns[0]["timestamp"],
        "turns": [
            {
                "user": t["user"],
                "assistant": t["assistant"],
                "emotion": t["emotion"],
            }
            for t in turns
        ],
    }
    journal = [
        {
            "title": "Exams in sight",
            "content": "I noticed the anxiety wave peaks at night. Walks plus journaling lowered it.",
            "emotion": "anxious",
            "tags": ["school", "sleep"],
        }
    ]
    return [plan], journal


def scenario_engineering_student(now, days: int = 14, chats_per_day: int = 3):
    companies = [
        "NexTech",
        "BrightWorks",
        "CodeNest",
        "OptiSoft",
        "DataForge",
        "LoopLabs",
    ]
    family_refs = ["Dad", "Mom", "Uncle", "Grandma", "older cousin"]
    coping = ["mock interview", "DSA revision", "portfolio update", "resume tweak", "deep breath drill"]
    plans = []
    journals = []

    for day in range(days):
        day_start = now - timedelta(days=(days - day))
        for chat_index in range(chats_per_day):
            company = companies[(day + chat_index) % len(companies)]
            relative = family_refs[(day + chat_index) % len(family_refs)]
            action = coping[(day + chat_index) % len(coping)]
            base_time = day_start + timedelta(hours=8 + chat_index * 4)

            if chat_index == 0:
                turns = [
                    {
                        "user": f"Day {day+1}, morning. {company} just rejected me without even a coding round. Being in a tier-3 college feels like an automatic fail.",
                        "assistant": "That shut door stings. What emotion is loudest right now when you read that rejection?",
                        "emotion": "sadness",
                    },
                    {
                        "user": f"It's mostly numbness mixed with panic. I keep thinking about the education loan clocks starting soon.",
                        "assistant": "That pressure from the loan is real. Let's name one small lever you still control this morning.",
                        "emotion": "fear",
                    },
                ]
            elif chat_index == 1:
                turns = [
                    {
                        "user": f"Afternoon update: pulled a {action} with my friend Arjun. I still freeze on simple DP questions.",
                        "assistant": "Practice can bring out the freeze before it loosens. Which DP concept tripped you up today?",
                        "emotion": "anxious",
                    },
                    {
                        "user": "It was the base case logic. I overthink and then blank. I need a calmer mind.",
                        "assistant": "Noticing the base case snag is progress. How about writing just the base cases tonight with no full solutions?",
                        "emotion": "neutral",
                    },
                ]
            else:
                turns = [
                    {
                        "user": f"Evening. {relative} asked again why I don't have an offer yet. I know they care but it feels like a verdict.",
                        "assistant": "Hearing that daily tally hurts. What would you want to tell them if you could pause time?",
                        "emotion": "anger",
                    },
                    {
                        "user": "I'd tell them I'm trying every minute, that referrals take time, and I'm scared too.",
                        "assistant": "That honesty matters. Maybe write that down and decide if a calm conversation could happen this weekend.",
                        "emotion": "sadness",
                    },
                ]

            plans.append(
                {
                    "title": f"Day {day+1} Chat {chat_index+1}",
                    "timestamp": base_time,
                    "turns": turns,
                }
            )

        if day % 2 == 0:
            journals.append(
                {
                    "title": f"Day {day+1} reflections",
                    "content": (
                        f"Tier-3 label still stings but mocks and referrals showed tiny progress today. "
                        f"Need to protect sleep and keep family talks gentle."
                    ),
                    "emotion": "anxious",
                    "tags": ["career", "family", "finance"],
                }
            )

    return plans, journals


SCENARIOS = {
    "alex_default": scenario_alex,
    "placement_pressure": scenario_engineering_student,
}


async def seed_conversation_data(
    session: AsyncSession,
    *,
    user: User,
    scenario_key: str,
) -> None:
    now = datetime.utcnow()
    scenario_fn = SCENARIOS.get(scenario_key, scenario_engineering_student)
    plans, journal_payloads = scenario_fn(now)

    for plan in plans:
        conversation = Conversation(
            user_id=user.id,
            title=plan["title"],
            created_at=plan["timestamp"],
            updated_at=plan["timestamp"],
        )
        session.add(conversation)
        await session.flush()

        history_payload = []
        last_user_text = ""

        for idx, turn in enumerate(plan["turns"]):
            ts = plan["timestamp"] + timedelta(minutes=idx * 6)
            user_msg = Message(
                conversation_id=conversation.id,
                role=MessageRole.user,
                content=turn["user"],
                created_at=ts,
            )
            session.add(user_msg)
            await session.flush()

            emotion_log = EmotionLog(
                user_id=user.id,
                conversation_id=conversation.id,
                message_id=user_msg.id,
                primary_emotion=turn["emotion"],
                confidence=0.8,
                created_at=ts,
            )
            session.add(emotion_log)

            await memory_service.maybe_store_semantic_memory(
                db=session,
                user_id=user.id,
                conversation_id=conversation.id,
                message_id=user_msg.id,
                message_text=turn["user"],
                emotion_label=turn["emotion"],
                source="seed",
            )

            assistant_msg = Message(
                conversation_id=conversation.id,
                role=MessageRole.assistant,
                content=turn["assistant"],
                created_at=ts + timedelta(minutes=3),
            )
            session.add(assistant_msg)

            history_payload.append({"role": "user", "content": turn["user"]})
            history_payload.append({"role": "assistant", "content": turn["assistant"]})
            last_user_text = turn["user"]
            conversation.updated_at = assistant_msg.created_at

        await memory_service.build_memory_bundle(
            db=session,
            user_id=user.id,
            conversation_id=conversation.id,
            history=history_payload,
            user_message=last_user_text,
        )

    for payload in journal_payloads:
        entry = JournalEntry(
            user_id=user.id,
            title=payload["title"],
            content=payload["content"],
            emotion=payload["emotion"],
            tags=payload["tags"],
            auto_extract=True,
            extraction_method="seed",
        )
        session.add(entry)


async def main():
    parser = argparse.ArgumentParser(description="Seed demo data.")
    parser.add_argument("--name", default="Alex Morgan")
    parser.add_argument("--email", default="alex.morgan@example.com")
    parser.add_argument("--password", default="AlexPass123!")
    parser.add_argument(
        "--scenario",
        default="alex_default",
        choices=list(SCENARIOS.keys()),
        help="Which scripted conversation to load.",
    )
    args = parser.parse_args()

    database_url = settings.database_url or "sqlite+aiosqlite:///./serenity.db"
    engine = create_async_engine(database_url, echo=False, future=True)
    SessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
    )

    async with SessionLocal() as session:
        user = await ensure_user(
            session, name=args.name, email=args.email, password=args.password
        )
        await clear_user_data(session, user_id=user.id)
        await seed_conversation_data(
            session,
            user=user,
            scenario_key=args.scenario,
        )
        await session.commit()
        print("\nSeed complete!")
        print(f"Name:     {args.name}")
        print(f"Email:    {args.email}")
        print(f"Password: {args.password}")
        print(f"Scenario: {args.scenario}\n")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
