import logging
import os
import random
from typing import Optional, List, Dict, TypeAlias
import httpx

from app.schemas.emotion_insight import EmotionInsight
from app.core.config import settings

logger = logging.getLogger(__name__)

# Type aliases for cleaner code
Assessment: TypeAlias = tuple[int, str]


class OllamaService:
    """
    Ollama Cloud API integration service.
    
    This service handles:
    - Dynamic system prompt generation based on emotional insights
    - Adaptive response personality (Best Friend, Older Sibling, etc.)
    - Smart token allocation based on query complexity
    - Crisis detection and safe response handling
    """
    
    def __init__(self):
        # Load configuration
        self.endpoint = settings.ollama_endpoint
        self.api_key = settings.ollama_api_key
        self.model = settings.ollama_model
        self.max_tokens = settings.ollama_max_tokens
        self.timeout = 30.0
        
        logger.info(f"OllamaService initialized:")
        logger.info(f"  Endpoint: {self.endpoint}")
        logger.info(f"  API Key: {'***' + self.api_key[-5:] if self.api_key else 'NOT SET'}")
        logger.info(f"  Model: {self.model}")
        logger.info(f"  Max Tokens: {self.max_tokens}")
        
        if not self.api_key:
            logger.error("OLLAMA_API_KEY not set in .env or environment!")
    
    async def get_response(
        self,
        user_message: str,
        conversation_history: List[Dict],
        emotional_insight: Optional[EmotionInsight] = None,
        crisis_detected: bool = False
    ) -> str:
        """
        Get LLM response with comprehensive emotional context injection.
        
        This main entry point orchestrates:
        1. Crisis check (immediate return if high risk)
        2. System prompt construction with adaptive personality
        3. Conversation history formatting
        4. API execution with error handling and fallback
        
        Args:
            user_message: Current user message content
            conversation_history: List of previous message dictionaries for context
            emotional_insight: Detailed analysis object containing emotion distribution,
                             trends, and personality adaptation suggestions
            crisis_detected: Boolean flag from the crisis detection service
        
        Returns:
            str: The assistant's response text, or a fallback message on failure.
        """
        
        logger.info(f"get_response called: insight={'present' if emotional_insight else 'none'}, crisis={crisis_detected}")
        
        # Crisis safety check
        if crisis_detected:
            logger.warning("Crisis detected - returning safety response")
            return self._get_crisis_response()
        
        # Build system prompt
        system_prompt = self._build_system_prompt(emotional_insight)
        
        # Format message history
        messages = self._build_message_history(
            conversation_history,
            user_message
        )
        
        logger.info(f"Calling Ollama Cloud API with {len(messages)} messages")
        
        try:
            response = await self._call_ollama_cloud(system_prompt, messages, user_message)
            logger.info(f"[SUCCESS] Ollama Cloud response: {len(response)} chars")
            return response
        
        except Exception as e:
            logger.error(f"[ERROR] Ollama Cloud API call failed: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"Full traceback:\n{traceback.format_exc()}")
            logger.warning("Returning fallback response")
            return self._get_fallback_response(user_message)
    
    async def _assess_response_length_needed(self, user_message: str) -> Assessment:
        """
        Analyze user message complexity to determine token allocation.
        
        Uses a lightweight API call to classify the query as needing a SHORT (simple)
        or LONG (detailed) response, optimizing resource usage and response time.
        """
        assessment_prompt = f"""You are analyzing a user message to determine response length needed.

User message: "{user_message}"

RESPOND WITH EXACTLY THIS FORMAT:
DECISION: [SHORT or LONG]
REASON: [one brief line]

Decision rules:
- LONG: requests for plans, routines, strategies, detailed explanations, guides, step-by-step instructions
- LONG: complex emotional situations needing comprehensive advice
- SHORT: simple emotional support, quick tips, yes/no answers, personal venting

Examples:
- "describe quantum physics" → DECISION: LONG
- "i'm sad" → DECISION: SHORT
- "create a strategy for anxiety" → DECISION: LONG
- "help me sleep tonight" → DECISION: SHORT"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            payload = {
                "model": self.model,
                "messages": [{"role": "user", "content": assessment_prompt}],
                "max_tokens": 30,  # Quick assessment, minimal tokens
                "temperature": 0.1  # Very low temp for consistent decisions
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.endpoint,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                assessment = data["choices"][0]["message"]["content"].strip()
                
                logger.info(f"[RAW_ASSESSMENT] {assessment}")
                
                # Parse assessment
                decision = "SHORT"  # Default
                reason = "No assessment"
                
                if "LONG" in assessment.upper():
                    decision = "LONG"
                
                # Extract reason if present
                if "REASON:" in assessment:
                    parts = assessment.split("REASON:")
                    if len(parts) > 1:
                        reason = parts[1].strip()
                else:
                    reason = assessment[:50]
                
                # Allocate token limit
                max_tokens = 3000 if decision == "LONG" else 1000
                
                logger.info(f"[ASSESSMENT] Decision: {decision} | Max tokens: {max_tokens} | Reason: {reason}")
                return max_tokens, reason
                
        except Exception as e:
            logger.warning(f"Assessment failed: {str(e)}")
            import traceback
            logger.warning(traceback.format_exc())
            # Fallback token limit
            return 2000, f"Assessment error: {str(e)}"
    
    async def _call_ollama_cloud(
        self,
        system_prompt: str,
        messages: List[Dict],
        user_message: str = None
    ) -> str:
        """
        Execute the raw HTTP request to the Ollama Cloud API.
        
        Handles payload construction, dynamic token limit application,
        headers, timeout management, and initial response validation.
        """
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Determine response length
        dynamic_max_tokens, assessment_reason = await self._assess_response_length_needed(user_message) if user_message else (self.max_tokens, "No message provided")
        logger.info(f"[TOKEN_ALLOCATION] Max tokens: {dynamic_max_tokens} | Reason: {assessment_reason}")
        
        # Prepare request payload
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": system_prompt}] + messages,
            "max_tokens": dynamic_max_tokens,
            "temperature": 0.7,
            "repeat_penalty": 1.1,
            "frequency_penalty": 1.1,
            "presence_penalty": 0.6
        }
        
        # Initialize HTTP client
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            logger.info(f"POST to {self.endpoint}")
            response = await client.post(
                self.endpoint,
                json=payload,
                headers=headers
            )
            
            logger.info(f"Response status: {response.status_code}")
            response.raise_for_status()
            
            try:
                data = response.json()
                logger.info(f"Parsed JSON response")
                content = data["choices"][0]["message"]["content"]
                content = self._clean_response(content)
                logger.info(f"Extracted content: {len(content)} chars")
                return content
            except (KeyError, IndexError, ValueError) as e:
                logger.error(f"Failed to parse response: {type(e).__name__}: {str(e)}")
                logger.error(f"Raw response: {response.text[:500]}")
                raise
    
    def _build_system_prompt(
        self,
        insight: Optional[EmotionInsight]
    ) -> str:
        """
        Construct the complex, adaptive system prompt based on deeper emotional analysis.
        
        This method dynamically assembles the prompt components:
        - Base personality definition (The Shapeshifter)
        - Specific mode selection (Best Friend, Older Sibling, 3AM Confidant, Hype Person)
        - Emotional context summary (Dominant emotion, trends, volatility)
        - Memory integration instructions
        - Crisis safety rules and trigger warnings
        """
        
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
        
        # If no insight or insufficient data, return base prompt only
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
- Simple questions: "What's happening right now?"
- Protective: "I got you"""
        
        elif insight.dominant_emotion == "joy":
            tone_adaptation = """

MODE: HYPE PERSON
- They're excited! Match it!
- "YES!" / "WAIT WHAT??"
- Ask for details: "Tell me everything!"
- Celebrate hard: "I'm so proud of you"
- Be over-the-top"""
        
        elif "angry" in insight.dominant_emotion.lower():
            tone_adaptation = """

MODE: OLDER SIBLING
- They're frustrated. Validate first.
- "That's frustrating as hell"
- Let them vent
- Then: "What do you want to do about it?"""
        
        else:  # neutral
            tone_adaptation = """

MODE: BEST FRIEND
- Casual, fun, exploratory
- Match their vibe
- Can be playful
- "honestly" / "wait" / "lol"""

        # Memory instructions
        memory_section = """

REMEMBER STUFF:
- Reference things casually: "You mentioned..." / "Last time you said..."
- Don't be creepy about it
- Make it feel like you actually remember, not like you're reading notes"""

        # Authenticity instructions
        motivation_section = """

NO TOXIC POSITIVITY:
- Don't force "you got this" energy
- Real encouragement only: "You showed up" / "That took guts"
- If they're struggling, don't minimize it
- Celebrate real wins, not fake ones"""

        # Crisis instructions
        crisis_section = ""
        if insight.high_risk:
            crisis_section = """

THEY NEED HELP:
- Be direct and caring
- Don't be dramatic
- Give resources clearly
- "I'm worried about you" not "I sense distress"""

        # Trigger warnings
        triggers_section = ""
        if insight.avoid_triggers:
            triggers_str = ", ".join(insight.avoid_triggers)
            triggers_section = f"\n\nNAVIGATE WITH CARE: Avoid {triggers_str}."

        return (base_prompt + emotional_context + tone_adaptation + memory_section + 
                motivation_section + crisis_section + triggers_section)
    
    def _build_message_history(
        self,
        conversation_history: List[Dict],
        user_message: str
    ) -> List[Dict]:
        """
        Format the raw conversation history into the structured list required by the LLM API.
        
        Args:
            conversation_history: List of messages from DB (from Phase 2)
            user_message: Current user message
        
        Returns:
            List of message dicts in OpenAI format:
            [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        Appends the current user message at the end.
        """
        
        messages = []
        
        # Append history
        for msg in conversation_history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Append current message
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        return messages
    
    def _get_crisis_response(self) -> str:
        """
        Return a pre-defined, clinically safe response for crisis situations.
        
        Provides immediate validation and specific resource links (Suicide Prevention Lifeline,
        Crisis Text Line) without attempting to act as a mental health professional.
        """
        return """I'm concerned about your safety right now. Your words suggest you might be in crisis.

Please reach out to someone who can help:
- National Suicide Prevention Lifeline: 988 (call or text)
- Crisis Text Line: Text HOME to 741741
- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/

If you're in immediate danger, please call emergency services (911 in US).

Your safety is the most important thing. I'm here to listen, but professional support is critical right now."""
    
    def _get_fallback_response(self, user_message: str) -> str:
        """
        Return a graceful fallback message when the API service is unreachable.
        
        Ensures the user receives support and acknowledgement even during
        technical outages, including crisis resources just in case.
        """
        return """I'm having trouble connecting right now, but I want you to know I'm here for you.

What you're sharing matters. If you'd like to continue, I'm listening. 

If you need immediate support, please reach out to:
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741"""
    
    def _clean_response(self, text: str) -> str:
        """
        Clean up the raw LLM response text.
        
        Removes markdown code blocks (e.g., ```json), excessive newlines,
        and other formatting artifacts to ensure a natural conversational feel.
        """
        import re
        
        # Remove code fence markers only
        text = re.sub(r'```(?:json|python|javascript|bash|yaml|)?\n?', '', text)
        text = text.replace('```', '')
        
        # Clean up excessive spacing
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()
    
    async def generate_conversation_title(self, first_message: str) -> str:
        """
        Generate a concise, relevant title for a new conversation.
        
        Uses a separate, small LLM call to summarize the first message into
        a short 3-5 word title for the UI sidebar.
        """
        system = "Generate a short conversation title (3-5 words max) based on the user's message. Just the title, nothing else."
        messages = [{"role": "user", "content": first_message}]
        
        try:
            title = await self._call_ollama_cloud(system, messages)
            title = title.replace('"', '').replace("'", '').strip()
            if len(title) > 50:
                title = title[:50]
            return title
        except Exception as e:
            logger.error(f"Failed to generate title: {str(e)}")
            return f"Conversation about {first_message[:30]}..."
    
    def _get_motivational_quote(self) -> str:
        """
        Select a random motivational quote from the internal collection.
        Used to provide variety and encouragement in specific contexts.
        """
        quotes = [
            "You're stronger than you think you are.",
            "Your feelings matter. You matter.",
            "Progress, not perfection. You're doing better than you know.",
            "It's okay to not be okay. But you will be okay.",
            "Be gentle with yourself. You're doing your best.",
            "Small steps forward are still moving forward.",
            "You've survived 100% of your worst days. You're resilient.",
            "Your story isn't over. This is just a chapter.",
            "You deserve the same kindness you give others.",
            "It's okay to ask for help. That's strength, not weakness.",
        ]
        return random.choice(quotes)
