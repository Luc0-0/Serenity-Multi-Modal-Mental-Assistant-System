"""
Journal extraction and management service.

Automatically extracts meaningful journal entries from user messages.
Uses rule-based qualification, deterministic summarization, and tagging.
Non-blocking: journal failures never affect chat flow.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.journal_entry import JournalEntry


class JournalService:
    """
    Extracts journaling content from conversations.
    
    Responsibilities:
    - Identify messages worth journaling
    - Extract summaries deterministically
    - Classify emotional and topical tags
    - Log to journal_entries table
    - Never block chat flow
    """
    
    # Qualification rules
    MIN_MESSAGE_LENGTH = 100  # Messages under this are too short
    
    # First-person reflection markers
    REFLECTION_MARKERS = [
        "i feel", "i felt", "i have been", "i've been",
        "lately", "recently", "because", "i think", "i realize",
        "i noticed", "i'm struggling", "i'm dealing with"
    ]
    
    # Strong emotional keywords that auto-qualify
    STRONG_EMOTIONS = [
        "sad", "depressed", "anxious", "overwhelmed", "stressed",
        "devastated", "heartbroken", "angry", "frustrated", "scared"
    ]
    
    # Tag extraction categories
    TAG_CATEGORIES = {
        "academic": ["exam", "school", "college", "university", "study", "test", "homework", "assignment"],
        "work": ["job", "work", "boss", "career", "meeting", "project", "deadline", "office"],
        "relationship": ["partner", "boyfriend", "girlfriend", "husband", "wife", "dating", "relationship"],
        "family": ["mother", "father", "family", "parent", "sibling", "brother", "sister", "home"],
        "health": ["sleep", "diet", "exercise", "health", "sick", "illness", "pain", "tired"],
        "crisis": ["hurt", "kill", "suicide", "overdose", "self-harm"]
    }
    
    def __init__(self):
        pass
    
    def should_create_entry(self, text: str, emotion_label: str = None) -> bool:
        """
        Determine if message qualifies for journal entry.
        
        Qualifies if:
        - Length >= MIN_MESSAGE_LENGTH
        - AND (has reflection marker OR strong emotion OR ends with question)
        - AND is not just whitespace
        
        Args:
            text: Message content
            emotion_label: Emotion detected (optional boost)
        
        Returns:
            True if should create entry, False otherwise
        """
        # Validate input
        if not text or not isinstance(text, str):
            return False
        
        text = text.strip()
        
        # Length check
        if len(text) < self.MIN_MESSAGE_LENGTH:
            return False
        
        text_lower = text.lower()
        
        # Has reflection marker?
        has_marker = any(marker in text_lower for marker in self.REFLECTION_MARKERS)
        
        # Has strong emotion?
        has_emotion = any(emotion in text_lower for emotion in self.STRONG_EMOTIONS)
        
        # Ends with question (self-reflection)?
        is_question = text.strip().endswith("?")
        
        # Strong emotion from emotion service?
        is_strong_detected = emotion_label in ["sadness", "fear", "anger"]
        
        return has_marker or has_emotion or is_question or is_strong_detected
    
    def extract_summary(self, text: str, max_length: int = 200) -> str:
        """
        Extract summary from message deterministically.
        
        Takes first 1-2 complete sentences up to max_length characters.
        Preserves punctuation and meaning.
        
        Args:
            text: Full message text
            max_length: Max characters in summary
        
        Returns:
            Summary string
        """
        if not text:
            return ""
        
        text = text.strip()
        
        # If shorter than max, return as-is
        if len(text) <= max_length:
            return text
        
        # Split into sentences
        sentences = text.split(".")
        summary = ""
        
        # Add sentences until we hit limit
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            candidate = summary + ("." if summary else "") + sentence + "."
            
            if len(candidate) <= max_length:
                summary = candidate
            else:
                break
        
        # If nothing added, take first max_length chars
        if not summary:
            summary = text[:max_length].rsplit(" ", 1)[0] + "..."
        
        return summary.strip()
    
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
        
        return tags
    
    def extract_mood(self, emotion_label: str) -> str:
        """
        Map emotion label to mood string for journal_entries.mood field.
        
        Args:
            emotion_label: From EmotionService (e.g., "sadness")
        
        Returns:
            Mood string for storage
        """
        mood_map = {
            "sadness": "sad",
            "joy": "happy",
            "anger": "angry",
            "fear": "anxious",
            "surprise": "surprised",
            "disgust": "disgusted",
            "neutral": "neutral"
        }
        return mood_map.get(emotion_label, "neutral")
    
    async def create_entry(
        self,
        db: AsyncSession,
        user_id: int,
        conversation_id: int,
        message_id: int,
        message_text: str,
        emotion_label: str = "neutral"
    ) -> Optional[int]:
        """
        Create journal entry from message.
        
        Creates JournalEntry with:
        - message_id: Source message ID
        - summary: First 1-2 sentences
        - mood: Mapped emotion label
        - tags: Extracted categories (JSON)
        - created_at: Server timestamp
        
        Non-blocking: catches exceptions and returns None.
        
        Args:
            db: Async session
            user_id: User ID
            conversation_id: Conversation ID
            message_id: Source message ID
            message_text: Full message content
            emotion_label: From emotion service
        
        Returns:
            journal_entry.id if successful, None if failed
        """
        try:
            # Extract components
            summary = self.extract_summary(message_text)
            tags = self.extract_tags(message_text)
            mood = self.extract_mood(emotion_label)
            
            # Create journal entry
            entry = JournalEntry(
                user_id=user_id,
                conversation_id=conversation_id,
                message_id=message_id,
                title=summary[:100],  # First 100 chars as title
                content=message_text,
                mood=mood,
                tags=",".join(tags) if tags else None,
                extracted_insights=summary
            )
            
            # Add and flush
            db.add(entry)
            await db.flush()
            entry_id = entry.id
            
            print(f"✓ Journal entry created: ID={entry_id}, mood={mood}, tags={tags}")
            return entry_id
            
        except Exception as e:
            print(f"✗ Failed to create journal entry: {str(e)}")
            return None  # Don't raise - non-blocking
