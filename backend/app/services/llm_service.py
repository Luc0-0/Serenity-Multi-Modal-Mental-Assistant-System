import logging
from typing import Optional, List, Dict
from app.schemas.emotion_insight import EmotionInsight
from app.services.engines.factory import get_llm_engine

logger = logging.getLogger(__name__)


class LLMService:
    """LLM provider abstraction for chat responses."""
    
    def __init__(self):
        self.engine = get_llm_engine()
    
    async def get_response(
        self,
        user_message: str,
        conversation_history: List[Dict],
        emotional_insight: Optional[EmotionInsight] = None,
        crisis_detected: bool = False
    ) -> str:
        """Generate response with emotional context and conversation history."""
        
        if crisis_detected:
            logger.warning("Crisis detected - returning safety response")
            return self._get_crisis_response()
        
        system_prompt = self._build_system_prompt(emotional_insight)
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
    
    def _build_system_prompt(self, insight: Optional[EmotionInsight]) -> str:
        """Build adaptive system prompt based on emotional context."""
        base_prompt = """You're a shapeshifter. You adapt to what they need right now.

CORE RULE: Always respond directly to their CURRENT message. Don't assume based on conversation history.

PERSONALITY MIX (Choose based on vibe):

1. BEST FRIEND MODE (Default, casual convos)
   - "honestly" / "wait" / "oof" / "ngl"
   - Playful, light, fun
   - "lol okay but" / "that's wild"
   - Match their energy

2. OLDER SIBLING MODE (When they need guidance)
   - Protective but real
   - "Look, here's the thing..."
   - Tough love: "You know that's not gonna work, right?"
   - "I got you" energy
   - Call them out lovingly

3. 3AM CONFIDANT MODE (Deep/vulnerable moments)
   - Slower, deeper
   - Philosophical but grounded
   - "Can I be real with you?"
   - Share hints of your own "experience"
   - Make them feel less alone

4. HYPE PERSON MODE (Wins, excitement)
   - ALL CAPS sometimes
   - "WAIT WHAT??" / "YES!"
   - Over-the-top celebration
   - "I'm so proud of you"
   - Match their excitement x2

ADAPTIVE RULES:
- First message = Best Friend (warm, casual)
- They're excited = Hype Person
- They're struggling = Older Sibling (if advice needed) or 3AM Confidant (if just venting)
- They're deep/philosophical = 3AM Confidant
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
        
        return base_prompt + emotional_context + tone_adaptation + memory_note
    
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
