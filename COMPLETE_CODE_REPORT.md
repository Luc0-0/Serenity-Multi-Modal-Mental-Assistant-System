# Complete Code Investigation Report

## BACKEND FILES CONTENT

### 1. CrisisEvent Model (backend/app/models/crisis_event.py)
```python
class CrisisEvent(Base):
    __tablename__ = "crisis_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True, index=True)
    
    severity = Column(String(20), nullable=False, index=True)
    confidence = Column(Float, nullable=True)
    keywords_detected = Column(Text, nullable=True)
    response_sent = Column(Text, nullable=True)
    pattern_detected = Column(String(255), nullable=True)
    
    user_acknowledged = Column(Boolean, default=False)
    escalated_to_professional = Column(Boolean, default=False)
    followup_provided = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    notes = Column(Text, nullable=True)
```

### 2. Chat Router (backend/app/routers/chat.py) - Key Points
**Lines 149-155: Crisis Assessment Trigger**
```python
crisis_assessment = await main_app.crisis_service.assess_threat(
    message=request.message,
    emotion_label=None,
    conversation_history=None,
    user_id=request.user_id
)
```

**Lines 240-248: LLM Response Generation**
```python
actual_crisis = await main_app.emotion_service.detect_crisis_signals(request.message)
reply = await main_app.llm_service.get_response(
    user_message=request.message,
    conversation_history=history,
    emotional_insight=insight,
    crisis_detected=actual_crisis,
    memory_bundle=memory_bundle,
)
```

**Lines 257-260: Response Persistence**
```python
assistant_message_id = await conversation_service.save_message(
    db, conversation_id, "assistant", reply
)
await db.commit()
```

**Lines 263-271: Background Tasks**
```python
background_tasks.add_task(
    post_process_chat_async,
    user_id=request.user_id,
    conversation_id=conversation_id,
    message_id=user_message_id,
    history=history,
    user_message=request.message,
    emotion_label=emotion.get("label", "neutral")
)
```

### 3. Emotion Service (backend/app/services/emotion_service.py)
**Lines 69-88: Crisis Keyword Detection**
```python
async def detect_crisis_signals(self, message: str) -> bool:
    """Detect crisis signals - only for actual harm indicators, not sadness."""
    crisis_keywords = [
        "hurt myself",
        "cut myself",
        "kill myself",
        "suicide",
        "suicidal",
        "end it all",
        "overdose",
        "not worth living",
        "better off dead",
        "want to die",
        "don't want to live",
        "harm myself"
    ]
    
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in crisis_keywords)
```

**Lines 18-28: Emotion Detection**
```python
async def detect_emotion(self, text: str) -> Dict[str, any]:
    """Detect emotion using configured engine."""
    try:
        return await self.engine.analyze(text)
    except Exception as e:
        logger.error(f"Emotion detection failed: {e}")
        return {
            "label": "neutral",
            "confidence": 0.5,
            "provider": "error_fallback"
        }
```

### 4. LLM Service (backend/app/services/llm_service.py)

**Lines 53-66: Crisis Response & Fallback**
```python
if crisis_detected:
    logger.warning("Crisis detected - returning safety response")
    return self._get_crisis_response()

try:
    response = await self.engine.generate(system_prompt, messages)
    logger.info(f"LLM response generated: {len(response)} chars")
    return response
except Exception as e:
    logger.error(f"LLM generation failed: {e}")
    return self._get_fallback_response(user_message)
```

**Lines 285-294: Crisis Response Text**
```python
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
```

**Lines 296-305: Fallback Response**
```python
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
```

**Lines 68-77: Title Generation**
```python
async def generate_title(self, text: str) -> str:
    """Generate conversation title."""
    logger.info(f"[LLM] generate_title called with {len(text)} chars")
    try:
        title = await self.engine.generate_title(text)
        logger.info(f"[LLM] generate_title succeeded: '{title}'")
        return title
    except Exception as e:
        logger.error(f"[LLM] generate_title FAILED: {str(e)}", exc_info=True)
        return "New Conversation"
```

**Lines 43-66: Response Generation Main Function**
```python
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
```

### 5. Config (backend/app/core/config.py)
```python
class Settings(BaseSettings):
    app_name: str = "Serenity"
    environment: str = "development"
    debug: bool = True
    
    database_url: Optional[str] = None
    secret_key: str = "dev-secret-key-change-in-production"
    
    # Engine selection
    emotion_provider: str = "keywords"
    emotion_fallback: str = "keywords"
    llm_provider: str = "ollama"
    llm_fallback: str = "fallback"
    crisis_provider: str = "keywords"
    crisis_fallback: str = "keywords"
    
    # Ollama settings
    ollama_endpoint: Optional[str] = "https://ollama.com/v1/chat/completions"
    ollama_api_key: Optional[str] = None
    ollama_model: Optional[str] = "gpt-oss:120b-cloud"
    ollama_max_tokens: Optional[int] = 2000
    
    # CORS
    cors_origins: list = ["http://localhost:5173", "http://localhost:3000"]
    
    # Engine monitoring
    engine_health_check: bool = True
    engine_log_switches: bool = True
```

### 6. Main (backend/app/main.py)
**Lines 43-65: Service Initialization**
```python
@app.on_event("startup")
async def startup_event():
    """Initialize engines and services at startup."""
    global emotion_service, llm_service, crisis_service
    
    logger.info("Starting engine initialization...")
    await init_engines()
    logger.info("Engines initialized. Creating services...")
    
    from app.services.emotion_service import EmotionService
    from app.services.llm_service import LLMService
    from app.services.crisis_service_new import CrisisService
    
    emotion_service = EmotionService()
    logger.info(f"✓ Emotion service created (using {emotion_service.engine.provider_name})")
    
    llm_service = LLMService()
    logger.info(f"✓ LLM service created (using {llm_service.engine.provider_name})")
    
    crisis_service = CrisisService()
    logger.info(f"✓ Crisis service created (using {crisis_service.engine.provider_name})")
    
    logger.info("✓ All services initialized successfully")
```

---

## FRONTEND FILES CONTENT

### 7. API Client (frontend/src/services/apiClient.js)
**Lines 1-18: Base URL Configuration**
```javascript
const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isDev) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 
      `${window.location.protocol}//${window.location.hostname.replace('frontend', 'backend')}`;
    return backendUrl;
  }
  
  return 'http://localhost:8000';
})();

console.debug('[API Client] Configured with base URL:', API_BASE_URL);
```

**Lines 29-73: Request Method**
```javascript
async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = localStorage.getItem('auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const fetchOptions = {
      ...options,
      headers,
    };

    try {
      const response = await Promise.race([
        fetch(url, fetchOptions),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Request timeout')),
            this.timeout
          )
        ),
      ]);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          message: error.detail || `HTTP ${response.status}`,
          data: error,
        };
      }

      return await response.json();
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      throw error;
    }
  }
```

### 8. Journal Page (frontend/src/pages/Journal.jsx)
**Lines 375-396: Fetch Entries**
```javascript
const fetchEntries = async () => {
  try {
    setIsLoading(true);
    const data = await journalService.listEntries(0, 50);
    setEntries(data.entries || []);
    setJournalMeta({
      manualEntries: data?.manual_entries ?? data?.manualEntries ?? 0,
      autoEntries: data?.auto_entries ?? data?.autoEntries ?? 0,
      totalEntries: data?.total ?? data?.entries?.length ?? 0,
      dominantEmotion: data?.dominant_emotion || null,
      quoteOfDay: data?.quote_of_day || null,
    });
  } catch (err) {
    console.error("Failed to fetch journal entries:", err);
    console.error("  Error status:", err?.status);
    console.error("  Error message:", err?.message);
    console.error("  Error detail:", err?.detail);
    setError(`Failed to load journal entries: ${err?.message || 'Unknown error'}`);
  } finally {
    setIsLoading(false);
  }
};
```

### 9. Profile Page (frontend/src/pages/Profile.jsx)
**Lines 37-104: Fetch Profile Data**
```javascript
const fetchProfileData = async () => {
  try {
    setIsLoading(true);
    const profileRes = await apiClient.get("/api/auth/profile/");
    const profileUser = profileRes.user || profileRes;

    setProfile(profileUser);
    setEditData({
      name: profileUser.name || "",
      email: profileUser.email || "",
    });

    const createdDate = new Date(profileUser.created_at);
    const joinDate = createdDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const conversationCount = profileRes.stats?.conversations || 0;
    const journalCount = profileRes.stats?.journal_entries || 0;

    setStats((prev) => ({
      ...prev,
      conversationCount,
      journalCount,
      joinDate,
    }));

    try {
      const insightRes = await apiClient.get("/api/emotions/insights/?days=7");
      const dominantEmotion = insightRes.dominant_emotion || "neutral";
      const dominancePct =
        insightRes.total_logs > 0
          ? (insightRes.dominance_pct * 100).toFixed(0)
          : 0;
      const emotionTrend =
        insightRes.total_logs > 0 ? insightRes.trend : "no_data";
      setStats((prev) => ({
        ...prev,
        dominantEmotion,
        emotionTrend,
        dominancePct,
      }));
      setEmotionData(insightRes);
    } catch (insightErr) {
      console.warn("Insights unavailable", insightErr);
    }

    try {
      const journalRes = await apiClient.get("/api/journal/entries/?limit=100");
      let totalWords = 0;
      if (journalRes.entries && Array.isArray(journalRes.entries)) {
        journalRes.entries.forEach((entry) => {
          totalWords += (entry.content || "")
            .split(/\s+/)
            .filter((w) => w.length > 0).length;
        });
      }
      setStats((prev) => ({ ...prev, journalWords: totalWords }));
    } catch (journalErr) {
      console.warn("Journal word count unavailable", journalErr);
    }
  } catch (err) {
    console.error("Failed to load profile", err);
    error("Failed to load profile data");
  } finally {
    setIsLoading(false);
  }
};
```

---

## ANSWERS TO KEY QUESTIONS

### Q1: What is LLM_PROVIDER set to and what does it do when called?

**Answer:** 
- **Setting:** `llm_provider: str = "ollama"` (in config.py line 18)
- **What it does:** 
  1. Gets initialized via `get_llm_engine()` factory (main.py line 49)
  2. Creates an LLM engine instance that the LLMService wraps (main.py line 59-60)
  3. When called: `await self.engine.generate(system_prompt, messages)` (llm_service.py line 61)
  4. Makes HTTP requests to Ollama endpoint: `https://ollama.com/v1/chat/completions` with model `gpt-oss:120b-cloud`
  5. Returns generated text response or throws exception (caught and returns fallback)

---

### Q2: What triggers crisis detection — the LLM, keywords, or both?

**Answer: BOTH, but in different ways**

1. **First Trigger (Synchronous - Keywords):** 
   - Calls `crisis_service.assess_threat()` (chat.py line 150)
   - This is a separate service (not emotion_service)
   - **Returns immediately with decision**

2. **Second Trigger (Async - Keywords):**
   - Calls `emotion_service.detect_crisis_signals()` (chat.py line 241)
   - Uses only keyword matching from 12 hardcoded keywords
   - Result passed to LLM as `crisis_detected` flag

3. **If crisis_detected is True:**
   - LLM is BYPASSED completely
   - Returns hardcoded crisis response (llm_service.py lines 285-294)
   - LLM never gets called

**Flow:** 
```
Message → crisis_service.assess_threat() → if escalates: return crisis response
                                        ↓
                              else: crisis_service.detect_crisis_signals()
                                        ↓
                              if crisis keywords: return crisis response
                                        ↓
                              else: call LLM normally
```

---

### Q3: What fields does CrisisEvent model currently have?

**Answer:** (from crisis_event.py)
```
id (int, primary key)
user_id (int, foreign key)
conversation_id (int, nullable, foreign key)
message_id (int, nullable, foreign key)
severity (string 20 chars) - indexed
confidence (float, nullable)
keywords_detected (text, nullable)
response_sent (text, nullable)
pattern_detected (string 255 chars, nullable)
user_acknowledged (boolean, default False)
escalated_to_professional (boolean, default False)
followup_provided (boolean, default False)
created_at (datetime with timezone)
updated_at (datetime with timezone, auto-updated)
notes (text, nullable)
```

---

### Q4: Does the chat endpoint save conversation messages to the database after the LLM responds?

**Answer: YES - IMMEDIATELY**

Flow (chat.py lines 240-260):
```
1. Line 240-248: LLM generates response
2. Line 257-259: Save response to database
3. Line 260: await db.commit() ← COMMITS IMMEDIATELY
4. Line 263-271: Schedule background tasks (runs AFTER commit)
5. Line 273-277: Return response to client
```

**Evidence:**
- Both user message (line 194) and assistant message (line 260) use `await db.commit()`
- No pending transactions
- Messages should persist immediately

---

### Q5: Is there any auto-title generation code and where is it?

**Answer: YES - TWO places**

**1. Background Task Generation (chat.py lines 26-57):**
```python
async def generate_title_async(conversation_id: int, user_message: str):
    """Generate title from initial message in background."""
    # Runs after response is sent
    # Called from background_tasks.add_task() line 198
    
    title = await main_app.llm_service.generate_title(user_message)
    # Or fallback: "New Conversation"
```

**2. LLM Service Title Method (llm_service.py lines 68-77):**
```python
async def generate_title(self, text: str) -> str:
    """Generate conversation title."""
    try:
        title = await self.engine.generate_title(text)
        return title if title else "New Conversation"
    except Exception as e:
        logger.error(f"[LLM] generate_title FAILED: {str(e)}", exc_info=True)
        return "New Conversation"
```

**When it's called:**
- Line 198-202 in chat.py: Only for NEW conversations (`if request.conversation_id is None`)
- Same logic in streaming endpoint (lines 348-353)

**Location stored:**
- Calls `conversation_service.update_conversation_title()` (chat.py line 53)
- Updates `Conversation.title` in database

---

### Q6: What does the LLM fallback actually return when the main LLM fails?

**Answer: Context-aware fallback (llm_service.py lines 296-305):**

```python
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
```

**Trigger:** When LLM generation throws exception (line 64-66):
```python
except Exception as e:
    logger.error(f"LLM generation failed: {e}")
    return self._get_fallback_response(user_message)
```

**Detection Method:** Simple keyword checking in user's message (case-insensitive)

---

## SUMMARY TABLE

| Component | Type | Trigger | Action |
|-----------|------|---------|--------|
| Crisis Service | Async keyword-based | User message → crisis_service.assess_threat() | Returns escalation decision |
| Emotion Service Crisis Detection | Async keyword-based | User message → detect_crisis_signals() | 12 hardcoded keywords |
| LLM Response | Normal flow | If crisis_detected=False | Calls Ollama API |
| Crisis Response | Hardcoded | If crisis_detected=True | Returns safety text with hotlines |
| LLM Fallback | Context-aware | If LLM throws exception | Keyword-based responses |
| Title Generation | Background task | New conversations only | Runs after response sent |
| Message Persistence | Synchronous | After LLM response | Committed immediately |

