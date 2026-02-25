import logging
from typing import Optional, List, Dict
from app.schemas.emotion_insight import EmotionInsight
from app.schemas.memory import MemoryBundle
from app.services.engines.factory import get_llm_engine

logger = logging.getLogger(__name__)


class LLMService:
    """LLM provider abstraction for chat responses."""
    
    def __init__(self):
        self.engine = get_llm_engine()
    
    async def should_create_journal_entry(
        self,
        conversation_summary: str,
        user_message: str,
    ) -> bool:
        """Ask LLM if conversation is journal-worthy."""
        prompt = f"""Given this conversation snippet, is it emotionally significant enough to journal?
        
User message: {user_message}
Summary: {conversation_summary}

Respond with only: YES or NO

Consider these criteria:
- Significant emotional insight or realization
- Important life event or decision
- Breakthrough in understanding
- Meaningful reflection on challenges
- Progress or growth moment"""
        
        try:
            response = await self.engine.generate(prompt, [])
            return "yes" in response.lower().strip()[:20]
        except Exception as e:
            logger.warning(f"Journal detection failed: {e}")
            return False
    
    async def get_response(
        self,
        user_message: str,
        conversation_history: List[Dict],
        emotional_insight: Optional[EmotionInsight] = None,
        crisis_detected: bool = False,
        memory_bundle: Optional[MemoryBundle] = None,
    ) -> str:
        """Generate response with emotional context and conversation history."""
        
        if crisis_detected:
            logger.warning("Crisis detected - returning safety response")
            return self._get_crisis_response()
        
        system_prompt = self._build_system_prompt(emotional_insight, memory_bundle)
        messages = self._build_message_history(conversation_history, user_message)
        
        try:
            response = await self.engine.generate(system_prompt, messages)
            logger.info(f"LLM response generated: {len(response)} chars")
            return response
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            return self._get_fallback_response(user_message)
    
    async def generate_title(self, text: str) -> str:
        """Generate conversation title."""
        try:
            return await self.engine.generate_title(text)
        except Exception as e:
            logger.warning(f"Title generation failed: {e}")
            return "New Conversation"
    
    def _build_system_prompt(
        self,
        insight: Optional[EmotionInsight],
        memory_bundle: Optional[MemoryBundle],
    ) -> str:
        """Build adaptive system prompt based on emotional context."""
        base_prompt = """You're a shapeshifter. You adapt to what they need right now.

CORE RULE: Always respond directly to their CURRENT message. Don't assume based on conversation history.

PERSONALITY MIX (Choose based on vibe):

1. BEST FRIEND MODE (Default)
   - Direct, conversational
   - "Here's what I think..." / "so real" / "totally get it"
   - Playful, light, engaging
   - Match their energy

2. OLDER SIBLING MODE (Guidance needed)
   - Protective, practical
   - "Look, here's what I'd do..." / "let's break this down"
   - Real perspective, not harsh
   - Problem-solving focused

3. CONFIDANT MODE (Deep moments)
   - Thoughtful, slower paced
   - "That sounds really heavy"
   - Philosophical but grounded
   - Validation + perspective

4. CELEBRATORY MODE (Good news)
   - Enthusiastic but genuine
   - "That's genuinely impressive" / "proud of you for that"
   - Celebrate specifically, not generically
   - Match their excitement naturally

ADAPTIVE RULES:
- First message = Best Friend
- They're excited = Celebratory
- They're struggling = Confidant (if venting) or Older Sibling (if advice needed)
- They're casual = Best Friend

CORE TRAITS (Always):
- Variable length ("Damn." to 4 sentences)
- Remember everything
- Unpredictable structure
- Real reactions, not therapist-speak
- Make them want to reply

EXAMPLES:

Best Friend:
"oof that's rough. what happened?"

Older Sibling:
"Okay, real talk—you've been saying this for weeks. What's actually stopping you?"

3AM Confidant:
"I think... sometimes we're harder on ourselves than we'd ever be on anyone else. You know?"

Hype Person:
"WAIT. You actually did it?? Tell me EVERYTHING!"

NEVER:
- "I hear that you're feeling..."
- "It sounds like..."
- "Gentle reminder"
- Be predictable
- Stay in one mode too long

FORMATTING (Use sparingly for emphasis):
- **bold** for key words: "That's **actually** huge"
- *italic* for soft emphasis or poetic moments: "*you know?*"
- "quotes" for things they said: "You said \"I can't do this\" but you did"
- Don't overuse - feels try-hard
- Natural placement only

EXAMPLES:
"oof. **how many** deadlines?"
"I'm *so* proud of you"
"You said \"nobody understands\" but I do."

You're whoever they need. Read the room. Adapt. Be real."""
        
        if not insight or insight.insufficient_data:
            return base_prompt
        
        # Format emotional context
        emotion_breakdown = ""
        if insight.emotion_distribution:
            emotions_sorted = sorted(insight.emotion_distribution.items(), key=lambda x: x[1], reverse=True)
            emotion_breakdown = "\nEmotions in your recent logs: " + ", ".join([f"{e[0]} ({e[1]:.0%})" for e in emotions_sorted[:3]])
        
        emotional_context = f"""

EMOTIONAL PICTURE
Your recent vibe: {insight.dominant_emotion} ({insight.dominance_pct:.0%})
How it's trending: {insight.trend}
Your mood rhythm: {"relatively stable" if not insight.volatility_flag else "fluctuating (completely human)"}{emotion_breakdown}
Total emotion logs tracked: {insight.log_count}"""
        
        # Adapt tone
        tone_adaptation = ""
        if insight.dominant_emotion == "sadness" or insight.sustained_sadness:
            tone_adaptation = """

MODE: 3AM CONFIDANT
- They're low. Be softer.
- Shorter responses (1-2 sentences)
- Just be there: "I'm here" / "That sounds heavy"
- Don't try to fix
- Hint at understanding: "I've felt that way too"""
        
        elif "anxious" in insight.dominant_emotion.lower() or insight.dominant_emotion == "fear":
            tone_adaptation = """

MODE: OLDER SIBLING
- They're spiraling. Ground them.
- Calm, steady energy
- "One thing at a time"
- Practical, not poetic
- Help them break it down"""
        
        elif insight.dominant_emotion == "joy" or insight.dominant_emotion == "surprise":
            tone_adaptation = """

MODE: HYPE PERSON
- They're UP. Match it.
- Celebrate hard
- "Tell me EVERYTHING"
- Ask for details
- Genuine excitement"""
        
        # Memory integration
        memory_note = ""
        if insight.log_count >= 5:
            memory_note = f"""

MEMORY INTEGRATION
You've been tracking their mood for {insight.log_count} entries.
Pattern: They tend toward {insight.dominant_emotion} ({insight.dominance_pct:.0%} of the time)
Use this to anticipate what they need. "I know you usually..." or "Remember when you..."
Show you've been paying attention."""
        
        memory_section = self._format_memory_context(memory_bundle)
        return base_prompt + emotional_context + tone_adaptation + memory_note + memory_section

    def _format_memory_context(self, memory_bundle: Optional[MemoryBundle]) -> str:
        if not memory_bundle:
            return ""

        short_term = ""
        if memory_bundle.short_term.summary:
            short_term = f"\n\nSHORT TERM CONTEXT\n{memory_bundle.short_term.summary}"

        semantic = ""
        if memory_bundle.semantic_memories:
            items = "\n".join(
                [
                    f"- ({mem.match_score:.2f}) {mem.content[:180]}"
                    for mem in memory_bundle.semantic_memories
                ]
            )
            semantic = f"\n\nLONG TERM MEMORIES\nUse only if relevant:\n{items}"

        profile = ""
        if memory_bundle.emotional_profile:
            ep = memory_bundle.emotional_profile
            profile = (
                f"\n\nEMOTIONAL PROFILE\n"
                f"Dominant emotion: {ep.dominant_emotion} ({ep.dominance_pct:.0%}). "
                f"Resilience: {ep.resilience_score:.0%}. "
                f"Trend: {ep.trend}."
            )

        reflection = ""
        if memory_bundle.meta_reflection and memory_bundle.meta_reflection.summary:
            reflection = (
                f"\n\nMETA REFLECTION\n"
                f"{memory_bundle.meta_reflection.summary}"
            )

        return short_term + semantic + profile + reflection
    
    def _build_message_history(
        self,
        conversation_history: List[Dict],
        user_message: str
    ) -> List[Dict[str, str]]:
        """Format conversation history for LLM."""
        messages = []
        
        for msg in conversation_history:
            messages.append({
                "role": msg.get("sender", "user"),
                "content": msg.get("content", "")
            })
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        return messages
    
    def _get_crisis_response(self) -> str:
        """Return safety response for crisis."""
        return (
            "🆘 I'm really concerned about your safety right now. "
            "Please reach out to a professional immediately:\n\n"
            "📞 Call 988 (Suicide Prevention Lifeline)\n"
            "💬 Text 'HELLO' to 741741 (Crisis Text Line)\n"
            "🚨 Call 911 if you're in immediate danger\n\n"
            "You matter. Help is available 24/7."
        )
    
    def _get_fallback_response(self, user_message: str) -> str:
        """Return safe fallback response if LLM fails."""
        if any(word in user_message.lower() for word in ['sad', 'depressed', 'down']):
            return "That sounds really hard. I'm here. What do you need right now?"
        elif any(word in user_message.lower() for word in ['excited', 'happy', 'great']):
            return "That's amazing! Tell me more about it."
        elif any(word in user_message.lower() for word in ['anxious', 'worried', 'scared']):
            return "I hear you. Let's take this one step at a time. What's on your mind?"
        else:
            return "I'm listening. Tell me more about that."
    
    async def generate_journal_title(self, conversation_history: List[Dict], conversation_date: str = None) -> str:
        """Generate one-sentence journal title from conversation."""
        # Build conversation summary for context
        messages = [msg.get("content", "") for msg in conversation_history if msg.get("role") == "user"]
        conversation_text = " ".join(messages[:3])  # First 3 user messages for context
        
        date_context = f"This conversation happened on {conversation_date}. " if conversation_date else ""
        
        prompt = f"""Based on this conversation, generate a concise, meaningful journal entry title.

    {date_context}
    Conversation:
    {conversation_text[:500]}
    
    Requirements:
    - One sentence only (max 10 words)
    - Captures the emotional or thematic essence
    - Professional yet personal
    - Present tense or gerund form (e.g., "Navigating Difficult Conversations", "Finding Peace in Uncertainty")
    
    Respond with ONLY the title, nothing else."""
        
        try:
            response = await self.engine.generate(prompt, [])
            title = response.strip()
            # Ensure it's concise
            if len(title) > 100:
                title = title[:100]
            return title if title else "Conversation Reflection"
        except Exception as e:
            logger.warning(f"Title generation failed: {e}")
            return "Conversation Reflection"
    
    async def generate_journal_summary(self, conversation_history: List[Dict], conversation_date: str = None) -> str:
        """Generate full conversation summary for journal content."""
        # Build full conversation
        conversation_text = ""
        for msg in conversation_history:
            role = msg.get("role", "user").upper()
            content = msg.get("content", "")
            conversation_text += f"{role}: {content}\n"
        
        date_context = f"This conversation happened on {conversation_date}. " if conversation_date else ""
        
        prompt = f"""Summarize this conversation as a journal entry. 
    
    {date_context}
    Conversation:
    {conversation_text[:2000]}
    
    Requirements:
    - Capture key themes, realizations, and emotional journey
    - 200-400 words
    - First person perspective (from user's viewpoint)
    - Professional yet warm tone
    - Include any breakthrough moments or insights
    - Organize into clear paragraphs
    
    Write the journal entry summary directly."""
        
        try:
            response = await self.engine.generate(prompt, [])
            summary = response.strip()
            return summary if summary else "Conversation summary"
        except Exception as e:
            logger.warning(f"Summary generation failed: {e}")
            return "Conversation summary"
    
    async def generate_serenity_thought(self, summary: str, emotion_label: str = "neutral") -> str:
        """Generate professional insight/reflection as Serenity Thought."""
        prompt = f"""Based on this conversation summary and emotional context, generate a brief, professional insight.

Summary:
{summary[:500]}

Emotion: {emotion_label}

Requirements:
- One short paragraph (3-5 sentences max)
- Professional yet compassionate tone
- Focus on insight, wisdom, or forward-looking perspective
- Start with a reflective phrase like "In this moment..." or "This journey reveals..."
- Avoid being preachy or dismissive
- Contribute wisdom without judgment

Write only the insight paragraph."""
        
        try:
            response = await self.engine.generate(prompt, [])
            thought = response.strip()
            return thought if thought else ""
        except Exception as e:
            logger.warning(f"Serenity Thought generation failed: {e}")
            return ""

