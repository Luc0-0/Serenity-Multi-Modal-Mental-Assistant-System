# Backend Structure - Phase 3 Ready

## Directory Tree

```
backend/
│
├── app/
│   │
│   ├── core/                          # Configuration & Settings
│   │   ├── config.py                 # Pydantic BaseSettings
│   │   └── __init__.py
│   │
│   ├── db/                           # Database Layer
│   │   ├── base.py                   # SQLAlchemy declarative base
│   │   ├── session.py                # Async engine, SessionLocal
│   │   └── __init__.py
│   │
│   ├── models/                       # ORM Models (SQLAlchemy)
│   │   ├── user.py                   # Users table
│   │   ├── conversation.py           # Conversations table
│   │   ├── message.py                # Messages table
│   │   ├── emotion_log.py            # Emotion tracking
│   │   ├── journal_entry.py          # Journal entries
│   │   └── __init__.py
│   │
│   ├── schemas/                      # Request/Response Models (Pydantic)
│   │   ├── chat.py                   # ChatRequest, ChatResponse
│   │   └── __init__.py
│   │
│   ├── services/                     # Business Logic
│   │   ├── ollama_service.py         # Ollama Cloud API client
│   │   ├── emotion_service.py        # Emotion detection
│   │   ├── journal_service.py        # Journal insight extraction
│   │   └── __init__.py
│   │
│   ├── routers/                      # API Endpoints
│   │   ├── health.py                 # GET /health
│   │   ├── chat.py                   # POST /api/chat
│   │   └── __init__.py
│   │
│   ├── main.py                       # FastAPI app, middleware, routes
│   └── __init__.py
│
├── alembic/                          # Database Migrations
│   ├── versions/                     # Migration scripts
│   │   └── __init__.py
│   ├── env.py                        # Migration environment config
│   ├── script.py.mako                # Migration template
│   └── __init__.py
│
├── alembic.ini                       # Alembic configuration
├── requirements.txt                  # Python dependencies
├── .env                              # Environment variables (secrets)
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore rules
├── README.md                         # Backend setup guide
└── STRUCTURE.md                      # This file
```

## Module Imports

### From `app.core`:
```python
from app.core import settings           # Global settings object
from app.core.config import Settings    # Settings class
```

### From `app.db`:
```python
from app.db import Base                 # SQLAlchemy Base
from app.db import SessionLocal          # Async session factory
from app.db import get_db                # Async dependency
```

### From `app.models`:
```python
from app.models import User
from app.models import Conversation
from app.models import Message
from app.models import EmotionLog
from app.models import JournalEntry
```

### From `app.schemas`:
```python
from app.schemas import ChatRequest
from app.schemas import ChatResponse
```

### From `app.services`:
```python
from app.services import OllamaService
from app.services import EmotionService
from app.services import JournalService
```

## Database Models

### User (users table)
```sql
id (Integer, Primary Key)
username (String 255, Unique)
email (String 255, Unique)
hashed_password (String 255)
is_active (Boolean)
created_at (DateTime)
updated_at (DateTime)
```

### Conversation (conversations table)
```sql
id (Integer, Primary Key)
user_id (Integer, Foreign Key → users.id)
title (String 255, Optional)
created_at (DateTime)
updated_at (DateTime)
```

### Message (messages table)
```sql
id (Integer, Primary Key)
conversation_id (Integer, Foreign Key → conversations.id)
role (Enum: 'user', 'assistant', 'system')
content (Text)
created_at (DateTime)
```

### EmotionLog (emotion_logs table)
```sql
id (Integer, Primary Key)
user_id (Integer, Foreign Key → users.id)
conversation_id (Integer, Optional)
primary_emotion (String 50)
confidence (Float 0-1)
intensity (Float 0-1)
tags (Text, Optional)
notes (Text, Optional)
created_at (DateTime)
```

### JournalEntry (journal_entries table)
```sql
id (Integer, Primary Key)
user_id (Integer, Foreign Key → users.id)
title (String 255, Optional)
content (Text)
mood (String 50, Optional)
extracted_insights (Text, Optional)
created_at (DateTime)
updated_at (DateTime)
```

## Services

### OllamaService
**Location:** `app/services/ollama_service.py`
```python
ollama_service = OllamaService()
await ollama_service.get_response(message, model="llama2")
```
- Async HTTP to Ollama Cloud
- Error handling
- Timeout protection

### EmotionService
**Location:** `app/services/emotion_service.py`
```python
emotion_service = EmotionService()
emotion_service.detect_emotion(message)      # → dict
emotion_service.detect_crisis_signals(message)  # → bool
```
- Emotion classification
- Crisis detection
- Extensible for NLP

### JournalService
**Location:** `app/services/journal_service.py`
```python
journal_service = JournalService()
journal_service.extract_insights(content)    # → str
journal_service.summarize_entry(content)     # → str
```
- Insight extraction
- Entry summarization
- Ready for LLM

## Configuration

### Environment Variables (.env)
```bash
ENVIRONMENT=development              # dev, staging, production
DEBUG=True                           # Debug mode
DATABASE_URL=sqlite:///./serenity.db # Database connection
OLLAMA_ENDPOINT=                     # Ollama Cloud URL
OLLAMA_API_KEY=                      # Ollama Cloud key
SECRET_KEY=dev-secret-key            # For JWT/sessions
```

### Access Anywhere:
```python
from app.core import settings

settings.environment        # "development"
settings.database_url       # Database URL
settings.ollama_endpoint    # Ollama endpoint
settings.debug              # Debug mode
```

## API Endpoints

| Method | Path | Status | Handler |
|--------|------|--------|---------|
| GET | `/` | ✅ | app.main.root() |
| GET | `/config` | ✅ | app.main.get_config() |
| GET | `/health` | ✅ | app.routers.health |
| GET | `/docs` | ✅ | FastAPI Swagger UI |
| POST | `/api/chat` | ✅ | app.routers.chat |

## Database Migrations (Alembic)

**Initialize migration:**
```bash
alembic revision --autogenerate -m "Initial migration"
```

**Run migrations:**
```bash
alembic upgrade head
```

**See revision history:**
```bash
alembic history
```

## Dependency Injection

### For Database Access:
```python
from fastapi import Depends
from app.db import get_db

@app.get("/example")
async def example(db: Session = Depends(get_db)):
    # db is async session
    pass
```

### For Services:
```python
from app.services import OllamaService

@router.post("/")
async def endpoint(request: Request):
    ollama = OllamaService()
    response = await ollama.get_response(request.message)
    return response
```

## Settings Pattern

**Access settings anywhere:**
```python
from app.core import settings

# Read from environment / .env
print(settings.debug)
print(settings.database_url)
print(settings.ollama_endpoint)
```

**No need to pass config around.**  
Pydantic automatically loads from `.env` on import.

## Error Handling

**OllamaService catches:**
- HTTP errors
- Timeouts
- JSON parse errors
- Returns graceful error message

**Routers use try/except:**
- Validate input with Pydantic
- Catch service errors
- Return 500 or appropriate status

## Database Defaults

### Default Database:
```
sqlite:///./serenity.db
```
(Created in backend folder)

### For Production:
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost/serenity
```

### Async Drivers:
- **PostgreSQL:** `asyncpg`
- **SQLite:** `aiosqlite`

---

**Status:** Ready for Phase 3 Ollama integration
