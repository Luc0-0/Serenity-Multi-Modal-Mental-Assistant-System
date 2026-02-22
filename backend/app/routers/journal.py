import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from app.db.session import get_db
from app.models.user import User
from app.models.journal_entry import JournalEntry
from app.routers.auth import get_current_user
from app.services.ollama_service import OllamaService
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Initialize Ollama service for title generation
ollama_service = OllamaService()

router = APIRouter(prefix="/api/journal", tags=["journal"])


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
        
        return {
            "entries": [
                {
                    "id": e.id,
                    "title": e.title,
                    "content": e.content[:200] + "..." if len(e.content or "") > 200 else e.content,
                    "emotion": e.emotion,
                    "tags": e.tags or [],
                    "auto_extract": e.auto_extract,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                    "updated_at": e.updated_at.isoformat() if e.updated_at else None
                }
                for e in entries
            ],
            "total": total,
            "skip": skip,
            "limit": limit
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
        # Use provided title or generate smart one from content
        title = payload.title
        auto_extract = False
        
        if not title or title == "Today's Entry":
            title = await generate_smart_title(payload.content)
            auto_extract = True  # Mark as auto-extracted if title was generated
        
        entry = JournalEntry(
            user_id=current_user.id,
            title=title,
            content=payload.content,
            emotion=payload.emotion,
            tags=payload.tags,
            auto_extract=auto_extract,
            extraction_method="manual" if not auto_extract else "ai"
        )
        
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        
        logger.info(f"Journal entry created: ID={entry.id}, title='{title}', emotion={payload.emotion}, auto_extract={auto_extract}")
        
        return {
            "id": entry.id,
            "title": entry.title,
            "content": entry.content,
            "emotion": entry.emotion,
            "tags": entry.tags or [],
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
    """Retrieve journal entry."""
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
            "content": entry.content,
            "emotion": entry.emotion,
            "tags": entry.tags or [],
            "auto_extract": entry.auto_extract,
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
            entry.title = payload.title
        if payload.content is not None:
            entry.content = payload.content
        if payload.emotion is not None:
            entry.emotion = payload.emotion
        if payload.tags is not None:
            entry.tags = payload.tags
        
        await db.commit()
        await db.refresh(entry)
        
        return {
            "id": entry.id,
            "title": entry.title,
            "content": entry.content,
            "emotion": entry.emotion,
            "tags": entry.tags or [],
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
