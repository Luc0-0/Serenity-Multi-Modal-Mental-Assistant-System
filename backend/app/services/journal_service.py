"""
Journal extraction and management service.

LLM-only extraction for journal entries.
Generates title, content summary, and insights from conversation history.
Non-blocking: journal failures never affect chat flow.
"""

import logging
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.journal_entry import JournalEntry

logger = logging.getLogger(__name__)


class JournalService:
    """
    Manages journal entry creation and updates via LLM-generated content.
    
    Responsibilities:
    - Create or update journal entries from conversation context
    - Generate LLM-based title, content, and thought
    - Classify topical tags
    - Track conversation-level extraction
    - Never block chat flow
    """
    
    # Tag extraction categories
    TAG_CATEGORIES = {
        "academic": ["exam", "school", "college", "university", "study", "test", "homework", "assignment"],
        "work": ["job", "work", "boss", "career", "meeting", "project", "deadline", "office"],
        "relationship": ["partner", "boyfriend", "girlfriend", "husband", "wife", "dating", "relationship"],
        "family": ["mother", "father", "family", "parent", "sibling", "brother", "sister", "home"],
        "health": ["sleep", "diet", "exercise", "health", "sick", "illness", "pain", "tired"],
        "crisis": ["hurt", "kill", "suicide", "overdose", "self-harm"]
    }

    EMOTION_NORMALIZATION = {
        "sad": "sadness",
        "sadness": "sadness",
        "grief": "sadness",
        "depressed": "sadness",
        "hopeless": "sadness",
        "melancholy": "sadness",
        "joy": "joy",
        "happy": "joy",
        "happiness": "joy",
        "delight": "joy",
        "anger": "anger",
        "angry": "anger",
        "rage": "anger",
        "mad": "anger",
        "fear": "fear",
        "anxiety": "fear",
        "anxious": "fear",
        "worry": "fear",
        "surprise": "surprise",
        "shocked": "surprise",
        "astonished": "surprise",
        "disgust": "disgust",
        "disgusted": "disgust",
        "gross": "disgust",
        "neutral": "neutral",
        "calm": "neutral",
        "ok": "neutral",
        "fine": "neutral"
    }

    MOOD_MAP = {
        "sadness": "sad",
        "joy": "happy",
        "anger": "angry",
        "fear": "anxious",
        "surprise": "surprised",
        "disgust": "disgusted",
        "neutral": "neutral"
    }
    
    def __init__(self):
        pass
    
    async def find_existing_entry(self, db: AsyncSession, conversation_id: int, user_id: int) -> Optional[JournalEntry]:
        """Find existing auto-extracted entry for conversation."""
        query = select(JournalEntry).where(
            (JournalEntry.conversation_id == conversation_id) &
            (JournalEntry.user_id == user_id) &
            (JournalEntry.auto_extract == True)
        )
        result = await db.execute(query)
        return result.scalars().first()
    
    def extract_tags(self, text: str) -> List[str]:
        """
        Extract topical and emotional tags from message.
        
        Searches for keywords in predefined categories.
        Returns list of matched tags.
        
        Args:
            text: Message content
        
        Returns:
            List of tag strings
        """
        if not text:
            return []
        
        text_lower = text.lower()
        tags = []
        
        # Check each category
        for category, keywords in self.TAG_CATEGORIES.items():
            # Check if any keyword matches
            if any(keyword in text_lower for keyword in keywords):
                tags.append(category)
        
        # Preserve order but remove duplicates and limit noise
        seen = set()
        cleaned = []
        for tag in tags:
            if tag not in seen:
                seen.add(tag)
                cleaned.append(tag)
            if len(cleaned) >= 5:
                break
        
        return cleaned

    def _normalize_tags(self, tags) -> List[str]:
        def _clean(value: str) -> Optional[str]:
            if value is None:
                return None
            text = str(value).strip()
            if not text or text.lower() in {"null", "none", "undefined", "[]"}:
                return None
            return text
        
        if not tags:
            return []
        
        if isinstance(tags, list):
            cleaned = [_clean(t) for t in tags]
            return [c for c in cleaned if c]
        
        if isinstance(tags, str):
            cleaned = [_clean(part) for part in tags.split(",")]
            return [c for c in cleaned if c]
        
        return []

    def _merge_tags(self, existing, new_tags) -> List[str]:
        merged = self._normalize_tags(existing)
        for tag in self._normalize_tags(new_tags):
            if tag not in merged:
                merged.append(tag)
        return merged
    
    def extract_mood(self, emotion_label: str) -> str:
        """
        Map emotion label to mood string for journal_entries.mood field.
        
        Args:
            emotion_label: From EmotionService (e.g., "sadness")
        
        Returns:
            Mood string for storage
        """
        return self.MOOD_MAP.get(emotion_label, "neutral")

    def normalize_emotion_label(self, label: Optional[str]) -> str:
        """
        Normalize arbitrary emotion strings to a known label.
        """
        if not label:
            return "neutral"
        normalized = str(label).strip().lower()
        if normalized in self.MOOD_MAP:
            return normalized
        return self.EMOTION_NORMALIZATION.get(normalized, "neutral")
    
    async def create_or_update_entry(
        self,
        db: AsyncSession,
        user_id: int,
        conversation_id: int,
        conversation_history: List[Dict],
        emotion_label: str = "neutral",
        llm_service = None,
        ai_confidence: float = 0.95,
        conversation_date: str = None
    ) -> Optional[int]:
        """
        Create or update journal entry with LLM-generated content.
        
        Conversation-level tracking:
        - Checks if entry already exists for this conversation
        - If exists: updates content/thoughts (appends to existing)
        - If new: creates entry with LLM-generated title, content, thought
        
        LLM Generation:
        - Title: One-sentence summary of entire conversation
        - Content: Full conversation summary with context
        - Thought: Professional insight/reflection (Serenity Thought)
        
        Non-blocking: catches exceptions and returns None.
        
        Args:
            db: Async session
            user_id: User ID
            conversation_id: Conversation ID
            conversation_history: List of message dicts from ConversationService
            emotion_label: Detected emotion label
            llm_service: LLMService instance for generating title/content/thought
            ai_confidence: Confidence score for extraction (default 0.95)
        
        Returns:
            journal_entry.id if successful, None if failed
        """
        try:
            emotion_label = self.normalize_emotion_label(emotion_label)
            # Find existing entry for this conversation
            existing_entry = await self.find_existing_entry(db, conversation_id, user_id)
            
            # Generate LLM content
            title = "Conversation Entry"  # Fallback, will be replaced by LLM
            content = ""  # Will be replaced by LLM
            thought = ""  # Will be replaced by LLM
            
            if llm_service:
                try:
                    # Generate title (1 sentence)
                    title = await llm_service.generate_journal_title(conversation_history, conversation_date)
                    
                    # Generate content (full summary)
                    content = await llm_service.generate_journal_summary(conversation_history, conversation_date)
                    
                    # Generate Serenity Thought (professional insight)
                    thought = await llm_service.generate_serenity_thought(content, emotion_label)
                except Exception as e:
                    logger.error(f"LLM content generation failed: {str(e)}")
                    # Fallback to basic extraction
                    title = "Conversation Entry"
                    content = self._basic_summary_from_history(conversation_history)
                    thought = ""
            
            # Extract tags from conversation
            conversation_text = " ".join([msg.get("content", "") for msg in conversation_history])
            tags = self.extract_tags(conversation_text)
            mood = self.extract_mood(emotion_label)
            
            if existing_entry:
                # UPDATE existing entry
                existing_entry.content = content
                existing_entry.extracted_insights = thought
                existing_entry.ai_summary = content
                existing_entry.ai_confidence = ai_confidence
                existing_entry.mood = mood
                existing_entry.emotion = emotion_label
                merged_tags = self._merge_tags(existing_entry.tags, tags)
                if merged_tags:
                    existing_entry.tags = merged_tags
                
                await db.flush()
                entry_id = existing_entry.id
                logger.info(
                    f"Journal entry updated: ID={entry_id}, conversation_id={conversation_id}, "
                    f"mood={mood}, tags={existing_entry.tags}"
                )
            else:
                # CREATE new entry
                entry = JournalEntry(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    message_id=None,  # No single message for conversation-level
                    title=title,
                    content=content,
                    emotion=emotion_label,
                    mood=mood,
                    tags=self._normalize_tags(tags) or [],
                    extracted_insights=thought,
                    auto_extract=True,
                    ai_summary=content,
                    ai_confidence=ai_confidence,
                    extraction_method="ai_conversation"
                )
                
                db.add(entry)
                await db.flush()
                entry_id = entry.id
                logger.info(
                    f"Journal entry created: ID={entry_id}, conversation_id={conversation_id}, "
                    f"mood={mood}, tags={entry.tags}"
                )
            
            return entry_id
            
        except Exception as e:
            logger.error(f"Failed to create/update journal entry: {str(e)}")
            return None  # Don't raise - non-blocking
    
    def _basic_summary_from_history(self, conversation_history: List[Dict]) -> str:
        """Fallback: create basic summary from conversation history."""
        summaries = []
        for msg in conversation_history:
            if msg.get("role") == "user":
                content = msg.get("content", "").strip()
                if content:
                    summaries.append(content[:150])
        return " ".join(summaries)[:500] if summaries else "Conversation summary"
    
    async def create_entry(
        self,
        db: AsyncSession,
        user_id: int,
        conversation_id: int,
        message_id: int,
        message_text: str,
        emotion_label: str = "neutral",
        ai_summary: str = None,
        ai_confidence: float = None,
        extraction_method: str = "ai"
    ) -> Optional[int]:
        """
        Create journal entry from message.
        
        Creates JournalEntry with:
        - message_id: Source message ID
        - summary: First 1-2 sentences (fallback if no AI summary)
        - mood: Mapped emotion label
        - tags: Extracted categories (JSON)
        - AI metadata: ai_summary, ai_confidence, extraction_method
        - created_at: Server timestamp
        
        Non-blocking: catches exceptions and returns None.
        
        Args:
            db: Async session
            user_id: User ID
            conversation_id: Conversation ID
            message_id: Source message ID
            message_text: Full message content
            emotion_label: From emotion service
            ai_summary: AI-generated summary (optional)
            ai_confidence: AI confidence score 0.0-1.0 (optional)
            extraction_method: "ai" or "manual" (default "ai")
        
        Returns:
            journal_entry.id if successful, None if failed
        """
        try:
            emotion_label = self.normalize_emotion_label(emotion_label)
            # Extract components
            tags = self.extract_tags(message_text)
            mood = self.extract_mood(emotion_label)
            
            # Create journal entry
            entry = JournalEntry(
                user_id=user_id,
                conversation_id=conversation_id,
                message_id=message_id,
                title=ai_summary[:100] if ai_summary else message_text[:100],
                content=message_text,
                emotion=emotion_label,
                mood=mood,
                tags=self._normalize_tags(tags) or [],
                extracted_insights=ai_summary if ai_summary else message_text[:200],
                auto_extract=True,
                ai_summary=ai_summary,
                ai_confidence=ai_confidence,
                extraction_method=extraction_method
            )
            
            # Add and flush
            db.add(entry)
            await db.flush()
            entry_id = entry.id
            
            logger.info(
                f"Journal entry created: ID={entry_id}, mood={mood}, tags={entry.tags}, "
                f"method={extraction_method}, confidence={ai_confidence}"
            )
            return entry_id
            
        except Exception as e:
            logger.error(f"Failed to create journal entry: {str(e)}")
            return None  # Don't raise - non-blocking
