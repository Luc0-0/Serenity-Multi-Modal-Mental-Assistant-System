from typing import Optional, List, Dict, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.crisis_event import CrisisEvent
import json


class CrisisService:
    """Crisis detection and response management."""
    
    EMERGENCY_KEYWORDS = {
        "direct": [
            "suicide plan", "kill myself", "going to kill myself",
            "going to overdose", "i'll overdose", "i want to overdose",
            "i'm going to jump", "going to jump", "i'll jump",
            "i have a plan", "i have a method", "i've decided to",
            "goodbye", "farewell", "see you in the next life",
            "this is my last message", "last goodbye", "final goodbye"
        ],
        "method": [
            "gun", "shoot myself", "rope", "noose", "hang myself",
            "pills", "overdose", "poison", "jump", "train", "bridge",
            "car exhaust", "crash my car", "wrist", "razor blade"
        ],
        "intent": [
            "won't be around", "won't see you again", "i won't be here",
            "i'm leaving", "i'm gone", "not coming back",
            "see you in afterlife", "meet me there", "you'll understand"
        ],
        "timeline": [
            "tonight", "tomorrow night", "this week", "soon", "very soon",
            "in a few hours", "in an hour", "right now", "immediately"
        ]
    }
    
    DANGER_KEYWORDS = {
        "ideation": [
            "hurt myself", "harm myself", "self-harm", "self harm",
            "cut myself", "cutting", "burn myself", "punch myself",
            "bang my head", "hit myself", "slap myself",
            "scratch myself", "hurt", "harm"
        ],
        "passive": [
            "want to die", "wish i was dead", "wish i wasn't alive",
            "wish i was never born", "shouldn't exist", "shouldn't be here",
            "i'm a burden", "better off without me", "everyone would be better off",
            "no one cares", "doesn't matter if i'm gone",
            "nobody would notice", "no one would miss me"
        ],
        "hopelessness": [
            "no point", "no point in living", "never get better",
            "never going to change", "trapped", "stuck forever",
            "can't take it anymore", "can't go on", "can't do this",
            "it's hopeless", "there's no hope", "no way out",
            "no future", "nothing to live for"
        ],
        "isolation": [
            "completely alone", "no one understands", "no one cares",
            "no support", "isolated", "abandoned", "rejected",
            "nobody loves me", "no one wants me"
        ]
    }
    
    WARNING_KEYWORDS = {
        "distress": [
            "overwhelmed", "can't handle", "breaking down", "falling apart",
            "losing it", "cracking up", "on edge",
            "stressed", "stressed out", "extreme stress", "severe anxiety"
        ],
        "emotional": [
            "depressed", "depression", "anxious", "anxiety",
            "miserable", "misery", "hopeless", "helpless",
            "desperate", "desperation", "numb", "empty",
            "worthless", "useless", "ashamed", "ashame"
        ],
        "struggle": [
            "struggling", "struggling to cope", "suffering", "in pain",
            "difficult", "tough time", "hard time", "difficult period",
            "having a hard time", "struggling with"
        ],
        "crisis": [
            "crisis", "emergency", "urgent", "urgent help",
            "really need help", "help me", "can't help", "need support"
        ]
    }
    
    RESOURCES = {
        "warning": [
            {
                "name": "Psychology Today - Find a Therapist",
                "url": "https://www.psychologytoday.com/us/basics/therapy",
                "type": "therapy",
                "description": "Directory of licensed therapists and counselors"
            },
            {
                "name": "SAMHSA National Helpline",
                "phone": "1-800-662-4357",
                "url": "https://www.samhsa.gov/find-help/national-helpline",
                "type": "support",
                "description": "Free, confidential, 24/7 treatment referral and information",
                "available": "24/7"
            },
            {
                "name": "BetterHelp - Online Therapy",
                "url": "https://www.betterhelp.com",
                "type": "therapy",
                "description": "Affordable online therapy with licensed counselors"
            }
        ],
        
        "danger": [
            {
                "name": "National Suicide Prevention Lifeline",
                "phone": "988",
                "text": "Text 'HELLO' to 741741",
                "url": "https://suicidepreventionlifeline.org",
                "type": "crisis",
                "available": "24/7",
                "description": "Free, confidential suicide prevention support"
            },
            {
                "name": "Crisis Text Line",
                "text": "Text HOME to 741741",
                "url": "https://www.crisistextline.org",
                "type": "crisis",
                "available": "24/7",
                "description": "Text-based crisis support for those who prefer texting"
            },
            {
                "name": "International Suicide Prevention Resources",
                "url": "https://findahelpline.com",
                "type": "international",
                "description": "Crisis hotlines by country"
            },
            {
                "name": "SAMHSA National Helpline",
                "phone": "1-800-662-4357",
                "available": "24/7",
                "type": "support"
            }
        ],
        
        "emergency": [
            {
                "name": "Emergency Services",
                "phone": "911",
                "type": "emergency",
                "description": "Call immediately. Police, ambulance, emergency response.",
                "action": "CALL 911 NOW"
            },
            {
                "name": "National Suicide Prevention Lifeline",
                "phone": "988",
                "available": "24/7",
                "type": "crisis",
                "description": "Call while waiting for emergency services"
            },
            {
                "name": "Emergency Room",
                "description": "Go to nearest hospital emergency room",
                "action": "Go to nearest ER"
            }
        ]
    }
    
    RESPONSES = {
        "warning": {
            "template": """I hear that you're going through a really difficult time right now. 
What you're feeling is valid, and it's important to take your emotions seriously.

I'm here to listen, but I want to be honest: a therapist or counselor can provide much more 
specialized support than I can. They're trained to help with exactly what you're experiencing.

Would it help to talk to someone who specializes in this? Here are some resources:
- SAMHSA Helpline: 1-800-662-4357 (free, 24/7)
- Psychology Today has a therapist finder at www.psychologytoday.com
- BetterHelp offers affordable online therapy

You don't have to go through this alone. Please reach out to someone.""",
            
            "short": "I'm concerned about what you're sharing. Please consider talking to a mental health professional. I've provided some resources above."
        },
        
        "danger": {
            "template": """I'm genuinely concerned about your safety right now. What you're describing is serious, 
and I want to be direct: you need support from someone trained in crisis situations.

Please contact one of these resources RIGHT NOW:

• National Suicide Prevention Lifeline: 988 (call or text)
  Free, confidential, available 24/7
  Trained counselors who specialize in crisis support

• Crisis Text Line: Text HOME to 741741
  If you prefer texting over calling
  Available 24/7

• International resources: findahelpline.com

If you're in immediate danger:
- Tell a trusted friend or family member RIGHT NOW
- Go to your nearest emergency room
- Call 911 if you feel you might act on these thoughts

Your life has value. These feelings can change with proper support. 
Please reach out to one of these resources immediately. They're trained for exactly this situation.""",
            
            "short": "This is serious. Please contact 988 (Suicide Prevention Lifeline) or go to your nearest ER. You don't have to face this alone."
        },
        
        "emergency": {
            "template": """CRISIS - THIS IS URGENT

Your safety is the only thing that matters right now.

CALL 911 IMMEDIATELY
or 
GO TO YOUR NEAREST EMERGENCY ROOM

While you're getting help, also contact:
• National Suicide Prevention Lifeline: 988 (available 24/7)

Tell someone you trust RIGHT NOW:
- A family member
- A friend  
- A doctor
- A teacher
- Anyone who can help get you to safety

Your life matters. This crisis is temporary, but you need help NOW.

If you've already called 911 or are on your way to the ER, stay with someone until help arrives.

You are not alone in this.""",
            
            "short": "CALL 911 NOW or go to your nearest emergency room. Your life matters."
        }
    }
    
    def __init__(self):
        self.last_assessment = None
    
    async def assess_threat(self, message: str, emotion_label: Optional[str] = None,
                            conversation_history: Optional[List[dict]] = None,
                            user_id: Optional[int] = None) -> Dict:
        """Assess severity level: normal, warning, danger, emergency."""
        try:
            severity = "normal"
            confidence = 0.0
            keywords_found = []
            pattern = None
            
            # Check keywords by severity
            em_keywords = self._find_keywords(message, self.EMERGENCY_KEYWORDS)
            d_keywords = self._find_keywords(message, self.DANGER_KEYWORDS)
            w_keywords = self._find_keywords(message, self.WARNING_KEYWORDS)
            keywords_found = em_keywords + d_keywords + w_keywords
            
            if em_keywords:
                severity = "emergency"
                confidence = 0.95
                pattern = "Emergency keywords detected"
            elif d_keywords:
                severity = "danger"
                confidence = 0.85
                pattern = "Danger keywords detected"
            elif w_keywords:
                severity = "warning"
                confidence = 0.70
                pattern = "Warning keywords detected"
            
            # Boost confidence with emotion context
            if emotion_label in ["sadness", "fear", "anger"]:
                if severity == "warning":
                    confidence = min(confidence + 0.15, 1.0)
                    pattern = f"Warning keywords + high {emotion_label}"
                elif severity == "normal" and len(message) > 150:
                    severity = "warning"
                    confidence = 0.65
                    pattern = f"High {emotion_label} emotion + extended message"
            
            # Check conversation pattern for escalation
            if conversation_history and len(conversation_history) > 2:
                pattern_severity, pattern_desc = self._analyze_pattern(conversation_history)
                if pattern_severity and pattern_severity > severity:
                    severity = pattern_severity
                    pattern = pattern_desc
            
            confidence = min(confidence, 1.0)
            response = self._generate_response(severity)
            resources = self.RESOURCES.get(severity, [])
            
            result = {
                "severity": severity,
                "confidence": confidence,
                "keywords_found": keywords_found,
                "emotion_context": emotion_label or "neutral",
                "pattern": pattern or "Assessment complete",
                "requires_escalation": severity in ["danger", "emergency"],
                "response": response,
                "resources": resources
            }
            
            if result["requires_escalation"] and user_id:
                self.last_assessment = result
                print(f"[CRISIS] {severity.upper()}: {pattern}")
            
            return result
        
        except Exception as e:
            print(f"✗ Crisis assessment failed: {str(e)}")
            # Return safe default (don't raise - non-blocking)
            return {
                "severity": "normal",
                "confidence": 0.0,
                "keywords_found": [],
                "emotion_context": emotion_label or "unknown",
                "pattern": "Assessment error",
                "requires_escalation": False,
                "response": "I'm here to listen and support you.",
                "resources": []
            }
    
    def _find_keywords(self, message: str, keyword_dict: Dict[str, List[str]]) -> List[str]:
        """Search message for matching crisis keywords."""
        if not message:
            return []
        
        message_lower = message.lower()
        found = []
        
        for category, keywords in keyword_dict.items():
            for keyword in keywords:
                if keyword.lower() in message_lower:
                    found.append(keyword)
        
        return found
    
    def _analyze_pattern(self, conversation_history: List[dict]) -> Tuple[Optional[str], Optional[str]]:
        """Detect escalating distress across messages."""
        if not conversation_history or len(conversation_history) < 3:
            return None, None
        

        user_messages = [
            m.get("content", "")
            for m in conversation_history
            if m.get("role") == "user"
        ]
        
        if len(user_messages) < 3:
            return None, None
        
        escalation_score = 0
        for i, msg in enumerate(user_messages[-3:]):
            danger_count = len(self._find_keywords(msg, self.DANGER_KEYWORDS))
            warning_count = len(self._find_keywords(msg, self.WARNING_KEYWORDS))
            escalation_score += (danger_count * (i + 1)) + (warning_count * 0.5)
        
        if escalation_score > 3:
            return "danger", "Pattern: Escalating distress across conversation"
        elif escalation_score > 1.5:
            return "warning", "Pattern: Increasing distress in recent messages"
        
        return None, None
    
    def _generate_response(self, severity: str) -> str:
        """Get crisis response template for severity level."""
        if severity in self.RESPONSES:
            return self.RESPONSES[severity]["template"]
        
        return "I'm here to listen and support you. How can I help?"
    
    async def log_crisis_event(self, db: AsyncSession, user_id: int, conversation_id: int,
                               message_id: int, assessment: Dict) -> Optional[int]:
        """Store crisis assessment to database."""
        try:
            event = CrisisEvent(
                user_id=user_id,
                conversation_id=conversation_id,
                message_id=message_id,
                severity=assessment["severity"],
                confidence=assessment["confidence"],
                keywords_detected=json.dumps(assessment["keywords_found"]),
                response_sent=assessment["response"][:500],  # Store first 500 chars
                pattern_detected=assessment["pattern"]
            )
            
            db.add(event)
            await db.flush()
            event_id = event.id
            print(f"✓ Crisis event logged: ID={event_id}, severity={assessment['severity']}")
            return event_id
        except Exception as e:
            print(f"✗ Failed to log crisis event: {str(e)}")
            return None
    
    def get_severity_level(self, severity: str) -> int:
        """Convert severity label to numeric level (0-3)."""
        levels = {
            "normal": 0,
            "warning": 1,
            "danger": 2,
            "emergency": 3
        }
        return levels.get(severity, 0)
    
    def is_more_severe(self, sev1: str, sev2: str) -> bool:
        """Check if severity 1 is more severe than severity 2."""
        return self.get_severity_level(sev1) > self.get_severity_level(sev2)
    
    def format_resources(self, resources: List[dict]) -> str:
        # Format resources as readable text
        if not resources:
            return "No resources available."
        lines = []
        for resource in resources:
            name = resource.get("name", "Resource")
            phone = resource.get("phone", "")
            text = resource.get("text", "")
            url = resource.get("url", "")
            available = resource.get("available", "")
            lines.append(f"\n• {name}")
            if phone:
                lines.append(f"  {phone}")
            if text:
                lines.append(f"  {text}")
            if available:
                lines.append(f"  {available}")
            if url:
                lines.append(f"  {url}")
        return "\n".join(lines)
    
    def get_statistics(self) -> Dict:
        # Return service statistics
        return {
            "emergency_keywords": len(self._flatten_keywords(self.EMERGENCY_KEYWORDS)),
            "danger_keywords": len(self._flatten_keywords(self.DANGER_KEYWORDS)),
            "warning_keywords": len(self._flatten_keywords(self.WARNING_KEYWORDS)),
            "total_keywords": (
                len(self._flatten_keywords(self.EMERGENCY_KEYWORDS)) +
                len(self._flatten_keywords(self.DANGER_KEYWORDS)) +
                len(self._flatten_keywords(self.WARNING_KEYWORDS))
            ),
            "resources_available": {
                "warning": len(self.RESOURCES.get("warning", [])),
                "danger": len(self.RESOURCES.get("danger", [])),
                "emergency": len(self.RESOURCES.get("emergency", []))
            }
        }
    
    def _flatten_keywords(self, keyword_dict: Dict) -> List[str]:
        # Flatten keyword dict to list
        result = []
        for category, keywords in keyword_dict.items():
            result.extend(keywords)
        return result


crisis_service = CrisisService()
