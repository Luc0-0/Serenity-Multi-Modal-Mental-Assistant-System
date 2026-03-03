import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.db.session import get_db
from app.models.user import User
from app.models.journal_entry import JournalEntry
from app.routers.auth import get_current_user
from app.services.ollama_service import OllamaService
from app.services.journal_service import JournalService
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Initialize Ollama service for title generation
ollama_service = OllamaService()
journal_service = JournalService()

router = APIRouter(prefix="/api/journal", tags=["journal"])

SERENITY_QUOTES = [
    {"text": "Every storm ends. This moment is just a cloud drifting by.", "author": "Serenity"},
    {"text": "Softness is not weakness; it is proof that you survived.", "author": "Serenity"},
    {"text": "Small steps still count as forward. Honor the inch you moved today.", "author": "Serenity"},
    {"text": "Let go of the timeline. Your heart heals on its own tempo.", "author": "Serenity"},
    {"text": "You can rewrite the story even in the middle of the page.", "author": "Serenity"},
    {"text": "Rest is sacred work. It is how courage grows back.", "author": "Serenity"},
    {"text": "Offer yourself the same grace you extend to everyone else.", "author": "Serenity"},
]


class JournalEntryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    emotion: str = Field(default="neutral", max_length=50)
    tags: list[str] = Field(default_factory=list)


class JournalEntryUpdate(BaseModel):
    title: str = Field(None, min_length=1, max_length=255)
    content: str = Field(None, min_length=1)
    emotion: str = Field(None, max_length=50)
    tags: list[str] = Field(None)


class JournalEntryResponse(BaseModel):
    id: int
    title: str
    content: str
    emotion: str
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def format_tags(value):
    def _clean(text):
        if text is None:
            return None
        normalized = str(text).strip()
        if not normalized or normalized.lower() in {"null", "none", "undefined", "[]"}:
            return None
        return normalized

    if isinstance(value, list):
        cleaned = []
        seen = set()
        for t in value:
            cleaned_value = _clean(t)
            if cleaned_value and cleaned_value not in seen:
                seen.add(cleaned_value)
                cleaned.append(cleaned_value)
        return cleaned
    if isinstance(value, str):
        cleaned = [_clean(part) for part in value.split(",")]
        deduped = []
        for c in cleaned:
            if c and c not in deduped:
                deduped.append(c)
        return deduped
    return []


def get_quote_of_day(reference: datetime | None = None):
    day = reference or datetime.utcnow()
    if not SERENITY_QUOTES:
        return None
    index = day.toordinal() % len(SERENITY_QUOTES)
    return SERENITY_QUOTES[index]


async def get_dominant_emotion_summary(db: AsyncSession, user_id: int):
    stmt = (
        select(JournalEntry.emotion, func.count(JournalEntry.id))
        .where(JournalEntry.user_id == user_id)
        .group_by(JournalEntry.emotion)
        .order_by(func.count(JournalEntry.id).desc())
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        return None
    raw_emotion, count = row
    normalized = journal_service.normalize_emotion_label(raw_emotion)
    return {
        "emotion": normalized,
        "display": normalized.capitalize(),
        "count": count
    }


async def generate_smart_title(content: str) -> str:
    """
    Generate a meaningful title from journal content using Ollama.
    
    Falls back to first sentence if Ollama fails (non-blocking).
    """
    try:
        # If content is short, don't call Ollama
        if len(content) < 50:
            return content.split("\n")[0][:100]
        
        # Call Ollama to generate title
        title = await ollama_service.generate_conversation_title(content)
        
        # Ensure title isn't empty and isn't too long
        if not title or len(title.strip()) == 0:
            return content.split(".")[0][:100]
        
        return title[:100]  # Max 100 chars
        
    except Exception as e:
        # Non-blocking: fallback to first sentence
        logger.warning(f"Failed to generate smart title with Ollama: {str(e)}")
        first_sentence = content.split(".")[0]
        return first_sentence[:100] if first_sentence else "Journal Entry"


@router.get("/entries/", response_model=dict)
async def list_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    emotion: str = Query(None),
    auto_extract: bool = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List journal entries with optional filtering by emotion and auto_extract status."""
    try:
        query = select(JournalEntry).where(JournalEntry.user_id == current_user.id)
        
        if emotion:
            query = query.where(JournalEntry.emotion == emotion)
        
        if auto_extract is not None:
            query = query.where(JournalEntry.auto_extract == auto_extract)
        
        query = query.order_by(JournalEntry.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        entries = result.scalars().all()
        
        count_stmt = select(func.count(JournalEntry.id)).where(JournalEntry.user_id == current_user.id)
        if emotion:
            count_stmt = count_stmt.where(JournalEntry.emotion == emotion)
        if auto_extract is not None:
            count_stmt = count_stmt.where(JournalEntry.auto_extract == auto_extract)
        
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        manual_stmt = select(func.count(JournalEntry.id)).where(
            JournalEntry.user_id == current_user.id
        ).where(or_(JournalEntry.auto_extract == False, JournalEntry.auto_extract.is_(None)))

        auto_stmt = select(func.count(JournalEntry.id)).where(
            (JournalEntry.user_id == current_user.id) &
            (JournalEntry.auto_extract == True)
        )

        manual_count = (await db.execute(manual_stmt)).scalar() or 0
        auto_count = (await db.execute(auto_stmt)).scalar() or 0
        dominant_emotion = await get_dominant_emotion_summary(db, current_user.id)
        quote_of_day = get_quote_of_day()

        return {
            "entries": [
                {
                    "id": e.id,
                    "title": e.title,
                    "content": e.content[:200] + "..." if len(e.content or "") > 200 else e.content,
                    "emotion": journal_service.normalize_emotion_label(e.emotion),
                    "mood": e.mood,
                    "tags": format_tags(e.tags),
                    "auto_extract": e.auto_extract,
                    "serenity_thought": e.extracted_insights,
                    "ai_summary": e.ai_summary,
                    "ai_confidence": e.ai_confidence,
                    "extraction_method": e.extraction_method,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                    "updated_at": e.updated_at.isoformat() if e.updated_at else None
                }
                for e in entries
            ],
            "total": total,
            "skip": skip,
            "limit": limit,
            "manual_entries": manual_count,
            "auto_entries": auto_count,
            "dominant_emotion": dominant_emotion,
            "quote_of_day": quote_of_day
        }
    except Exception as e:
        logger.error(f"Failed to list entries: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch entries")


@router.post("/entries/", response_model=dict)
async def create_entry(
    payload: JournalEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create journal entry with AI-generated smart title if not provided."""
    try:
        requested_title = (payload.title or "").strip()
        uses_auto_title = False
        if not requested_title or requested_title.lower() in {"today's entry", "todays entry"}:
            requested_title = await generate_smart_title(payload.content)
            uses_auto_title = True

        normalized_emotion = journal_service.normalize_emotion_label(payload.emotion)
        mood = journal_service.extract_mood(normalized_emotion)
        
        entry = JournalEntry(
            user_id=current_user.id,
            title=requested_title,
            content=payload.content,
            emotion=normalized_emotion,
            mood=mood,
            tags=format_tags(payload.tags),
            auto_extract=False,
            extraction_method="manual_ai_title" if uses_auto_title else "manual"
        )
        
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        
        logger.info(
            "Journal entry created: ID=%s, title='%s', emotion=%s, auto_extract=%s",
            entry.id,
            requested_title,
            normalized_emotion,
            entry.auto_extract,
        )
        
        return {
            "id": entry.id,
            "title": entry.title,
            "content": entry.content,
            "emotion": normalized_emotion,
            "tags": format_tags(entry.tags),
            "auto_extract": entry.auto_extract,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
            "updated_at": entry.updated_at.isoformat() if entry.updated_at else None
        }
    except Exception as e:
        logger.error(f"Failed to create entry: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create entry")


@router.get("/entries/{entry_id}/", response_model=dict)
async def get_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve full journal entry with all content and Serenity Thought."""
    try:
        stmt = select(JournalEntry).where(
            (JournalEntry.id == entry_id) &
            (JournalEntry.user_id == current_user.id)
        )
        
        result = await db.execute(stmt)
        entry = result.scalar_one_or_none()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        return {
            "id": entry.id,
            "title": entry.title,
            "content": entry.content,  # Full content, no truncation
            "emotion": entry.emotion,
            "mood": entry.mood,
            "tags": format_tags(entry.tags),
            "auto_extract": entry.auto_extract,
            "ai_summary": entry.ai_summary,
            "serenity_thought": entry.extracted_insights,  # Professional insight
            "ai_confidence": entry.ai_confidence,
            "extraction_method": entry.extraction_method,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
            "updated_at": entry.updated_at.isoformat() if entry.updated_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get entry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch entry")


@router.put("/entries/{entry_id}/", response_model=dict)
async def update_entry(
    entry_id: int,
    payload: JournalEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update journal entry."""
    try:
        stmt = select(JournalEntry).where(
            (JournalEntry.id == entry_id) &
            (JournalEntry.user_id == current_user.id)
        )
        
        result = await db.execute(stmt)
        entry = result.scalar_one_or_none()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        if payload.title is not None:
            entry.title = payload.title.strip()
        if payload.content is not None:
            entry.content = payload.content.strip()
        if payload.emotion is not None:
            entry.emotion = journal_service.normalize_emotion_label(payload.emotion)
            entry.mood = journal_service.extract_mood(entry.emotion)
        if payload.tags is not None:
            entry.tags = format_tags(payload.tags)
        
        await db.commit()
        await db.refresh(entry)
        
        return {
            "id": entry.id,
            "title": entry.title,
            "content": entry.content,
            "emotion": entry.emotion,
            "tags": format_tags(entry.tags),
            "auto_extract": entry.auto_extract,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
            "updated_at": entry.updated_at.isoformat() if entry.updated_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update entry: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update entry")


@router.delete("/entries/{entry_id}/")
async def delete_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete journal entry."""
    try:
        stmt = select(JournalEntry).where(
            (JournalEntry.id == entry_id) &
            (JournalEntry.user_id == current_user.id)
        )
        
        result = await db.execute(stmt)
        entry = result.scalar_one_or_none()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        await db.delete(entry)
        await db.commit()
        
        return {"message": "Entry deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete entry: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete entry")


@router.get("/search/")
async def search_entries(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Search journal entries."""
    try:
        search_term = f"%{q}%"
        
        stmt = select(JournalEntry).where(
            (JournalEntry.user_id == current_user.id) &
            ((JournalEntry.title.ilike(search_term)) |
             (JournalEntry.content.ilike(search_term)))
        ).order_by(JournalEntry.created_at.desc()).limit(20)
        
        result = await db.execute(stmt)
        entries = result.scalars().all()
        
        return {
            "query": q,
            "results": [
                {
                    "id": e.id,
                    "title": e.title,
                    "content": e.content[:200] + "..." if len(e.content or "") > 200 else e.content,
                    "emotion": e.emotion,
                    "auto_extract": e.auto_extract,
                    "created_at": e.created_at.isoformat() if e.created_at else None
                }
                for e in entries
            ],
            "total": len(entries)
        }
    except Exception as e:
        logger.error(f"Failed to search entries: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search entries")
