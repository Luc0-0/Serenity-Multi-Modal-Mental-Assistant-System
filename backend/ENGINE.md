# Serenity AI Engine Architecture

## Overview

Serenity uses a **pluggable engine system** for AI capabilities. Each engine type (emotion, LLM, crisis) can be swapped via environment configuration without code changes.

## Engine Types

### Emotion Engines
Analyze text for emotional content.

**Available Providers:**
- `xlnet` - HuggingFace XLNet transformer model (more accurate, slower)
- `keywords` - Fast keyword-based detection (always available, fallback)

**Configuration:**
```env
EMOTION_PROVIDER=keywords      # Primary provider
EMOTION_FALLBACK=keywords      # Fallback chain
```

**Interface:**
```python
await engine.analyze(text: str) -> {
    'label': str,           # emotion label
    'confidence': float,    # 0-1 confidence score
    'provider': str         # which engine provided result
}
```

---

### LLM Engines
Generate conversational responses.

**Available Providers:**
- `ollama` - Ollama Cloud API for chat responses
- `fallback` - Safe template-based responses (always available)

**Configuration:**
```env
LLM_PROVIDER=ollama            # Primary provider
LLM_FALLBACK=fallback          # Fallback chain

OLLAMA_ENDPOINT=https://ollama.com/v1/chat/completions
OLLAMA_API_KEY=your_key_here
OLLAMA_MODEL=gpt-oss:120b-cloud
OLLAMA_MAX_TOKENS=2000
```

**Interface:**
```python
await engine.generate(
    system_prompt: str,
    messages: List[Dict],
    **kwargs
) -> str  # Generated response

await engine.generate_title(text: str) -> str  # Conversation title
```

**System Prompt:** Adaptive "Shapeshifter" personality that switches between:
- Best Friend (casual, playful)
- Older Sibling (protective, grounded)
- 3AM Confidant (vulnerable, understanding)
- Hype Person (celebratory, energetic)

Tone adapts automatically based on emotional context.

---

### Crisis Engines
Detect crisis situations and provide resources.

**Available Providers:**
- `keywords` - Keyword-based detection with emergency escalation

**Configuration:**
```env
CRISIS_PROVIDER=keywords       # Only provider currently
CRISIS_FALLBACK=keywords
```

**Interface:**
```python
await engine.assess(
    message: str,
    emotion_label: Optional[str],
    history: Optional[List[str]]
) -> {
    'requires_escalation': bool,
    'severity': str,            # 'warning' | 'danger' | 'emergency' | None
    'confidence': float,        # 0-1
    'response': str,            # Crisis response message
    'resources': List[Dict]     # Emergency resources
}
```

**Severity Levels:**
- `warning` - Distress signals, recommend support
- `danger` - Self-harm ideation, immediate intervention
- `emergency` - Suicide plan, highest priority

---

## Architecture

```
App Startup
    ↓
init_engines() called
    ↓
Load provider config from env
    ↓
Factory creates engines with fallback chain
    ↓
Services initialized with engines
    ↓
Ready to process requests
```

### Initialization Flow

```python
# In main.py
@app.on_event("startup")
async def startup_event():
    await init_engines()

# Returns initialized global engines
emotion_engine = get_emotion_engine()
llm_engine = get_llm_engine()
crisis_engine = get_crisis_engine()
```

### Service Layer

Services are thin wrappers around engines:

```python
class EmotionService:
    def __init__(self):
        self.engine = get_emotion_engine()
    
    async def detect_emotion(self, text):
        return await self.engine.analyze(text)

class LLMService:
    def __init__(self):
        self.engine = get_llm_engine()
    
    async def get_response(self, system_prompt, messages):
        return await self.engine.generate(system_prompt, messages)

class CrisisService:
    def __init__(self):
        self.engine = get_crisis_engine()
    
    async def assess_threat(self, message, emotion, history):
        return await self.engine.assess(message, emotion, history)
```

---

## Fallback Chain

Each engine type has a fallback chain. If primary provider fails, system automatically tries next.

```env
EMOTION_PROVIDER=xlnet
EMOTION_FALLBACK=keywords    # Try keywords if xlnet fails

LLM_PROVIDER=ollama
LLM_FALLBACK=fallback        # Try fallback if ollama fails

CRISIS_PROVIDER=keywords
CRISIS_FALLBACK=keywords     # No alternatives, always works
```

**Example:** Ollama API unavailable
```
1. Try Ollama → API timeout
2. Try Fallback → Returns safe template response
3. User sees response, doesn't know Ollama failed
```

---

## Current Configuration

**Development (.env):**
```env
EMOTION_PROVIDER=keywords
LLM_PROVIDER=ollama
CRISIS_PROVIDER=keywords

OLLAMA_ENDPOINT=https://ollama.com/v1/chat/completions
OLLAMA_API_KEY=your_api_key
OLLAMA_MODEL=gpt-oss:120b-cloud
```

**Docker (.env.docker):**
```env
EMOTION_PROVIDER=keywords
LLM_PROVIDER=ollama
CRISIS_PROVIDER=keywords

OLLAMA_ENDPOINT=https://ollama.com/v1/chat/completions
OLLAMA_API_KEY=your_api_key
OLLAMA_MODEL=gpt-oss:120b-cloud
```

---

## Monitoring

Check engine status via health endpoint:

```bash
GET /health/engines
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-02-23T10:30:00",
  "engines": {
    "emotion": {
      "provider": "keywords",
      "available": true,
      "engine_name": "keywords"
    },
    "llm": {
      "provider": "ollama",
      "available": true,
      "engine_name": "ollama"
    },
    "crisis": {
      "provider": "keywords",
      "available": true,
      "engine_name": "keywords"
    }
  }
}
```

---

## Adding New Engines

### Add Emotion Engine

1. Create file: `backend/app/services/engines/emotion/newmodel.py`
```python
from app.services.engines.base import EmotionEngine

class NewEmotionEngine(EmotionEngine):
    async def analyze(self, text: str) -> Dict:
        # Implement emotion analysis
        pass
    
    @property
    def provider_name(self) -> str:
        return 'newmodel'
    
    @property
    def is_available(self) -> bool:
        return True  # Check if dependencies available
```

2. Update factory:
```python
# In factory.py create_emotion_engine()
if provider == 'newmodel':
    return NewEmotionEngine()
```

3. Update config:
```env
EMOTION_PROVIDER=newmodel
```

### Add LLM Engine

Same pattern - create new file in `engines/llm/`, implement `LLMEngine` interface, update factory.

---

## File Structure

```
backend/app/services/
├── engines/
│   ├── __init__.py
│   ├── base.py                 # Abstract interfaces
│   ├── factory.py              # EngineFactory, initialization
│   ├── emotion/
│   │   ├── __init__.py
│   │   ├── xlnet.py           # XLNet implementation
│   │   └── keywords.py        # Keyword implementation
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── ollama.py          # Ollama implementation
│   │   └── fallback.py        # Safe fallback
│   └── crisis/
│       ├── __init__.py
│       └── keywords.py        # Keyword implementation
├── emotion_service.py          # Uses emotion engine
├── llm_service.py             # Uses LLM engine
└── crisis_service_new.py      # Uses crisis engine
```

---

## Personality System

LLM system prompt is dynamically built based on user emotional state:

**Base Layer:** Shapeshifter personality with 4 modes

**Emotional Adaptation:**
- Sadness → 3AM Confidant (softer, shorter)
- Anxiety → Older Sibling (grounded, practical)
- Joy → Hype Person (celebratory, energetic)
- Default → Best Friend (casual, warm)

**Memory Integration:**
- References past conversations
- Notices patterns
- Builds inside jokes
- Celebrates progress

**Formatting Rules:**
- Variable response length for dopamine
- Unpredictable structure
- Real reactions, not therapist-speak
- Intentional formatting (bold, italic, quotes)

---

## Testing Engines

```python
# Test emotion engine swap
async def test():
    engine1 = await EngineFactory.get_emotion_engine_with_fallback('xlnet')
    result1 = await engine1.analyze("I'm sad")
    
    engine2 = await EngineFactory.get_emotion_engine_with_fallback('keywords')
    result2 = await engine2.analyze("I'm sad")
```

---

## Logs

Engine initialization logs to stdout:
```
✓ XLNet emotion engine initialized
✓ Ollama LLM engine initialized
✓ Keyword crisis engine initialized
✓ All engines initialized successfully
```

Fallback logs on provider switch:
```
✗ XLNet analysis failed: GPU OOM
✓ Using emotion engine: keywords
```

---

## Performance Notes

- **Emotion:** XLNet ~100ms, Keywords ~1ms
- **LLM:** Ollama 1-3s, Fallback <1ms
- **Crisis:** Keywords <1ms

Async/await ensures non-blocking operations.
