# Serenity — Multi-Modal Mental Health Assistant

> A quieter place for your mind.

**Live Demo →** [serenity.nipun.space](https://serenity.nipun.space)

Serenity is an AI-powered mental health companion built as a final year BTech project (AI & Data Science). It combines a layered memory system, adaptive personality, real-time emotion detection, and crisis-safe response logic into a single full-stack application — deployed and actively in development.

---

## What it does

Most chatbots forget you the moment a conversation ends. Serenity doesn't. Every interaction is stored across four memory tiers — short-term context, semantic vector memory, a 30-day emotional profile, and pattern-based meta-reflections — so the assistant builds a genuine understanding of the user over time.

Alongside memory, it runs a real-time emotion pipeline on every message, adapts its personality to what the user needs in that moment, and routes any input flagged as a crisis through a hardened response path before the LLM ever sees it.

---

## Architecture

The system is divided into five layers:

**Frontend** — React 19 SPA with Vite, CSS Modules, Framer Motion, and GSAP. Pages include CheckIn (chat), Journal, Insights, Meditate, and Profile. State is managed via context providers with localStorage persistence.

**Backend** — FastAPI with async SQLAlchemy 2.0. All AI logic lives in a pluggable engine system — EmotionEngine, LLMEngine, and CrisisEngine are swappable at config level without touching service code. Background tasks (title generation, memory storage, journal extraction, analytics) run non-blocking via FastAPI's BackgroundTasks.

**Database** — PostgreSQL 15 (Supabase). 10 tables covering users, conversations, messages, emotion logs, journal entries, crisis events, semantic memories, emotional profiles, meta-reflections, and context cache. Migrations managed with Alembic.

**AI/ML Layer** — Primary emotion detection uses a keyword engine (~65% accuracy, no GPU required). Optional XLNet integration (~88%) and Ollama-based emotion detection are pluggable replacements. LLM responses are served via Ollama Cloud (`gpt-oss:120b-cloud`) with a template fallback chain if the API is unavailable.

**Infrastructure** — Docker Compose for local development. Production deployment across Vercel (frontend), Railway (backend), and Supabase (PostgreSQL).

![System Architecture](./frontend/public/docs/serenity-dark-01-architecture.svg)

---

## Memory System

This is the core technical contribution of the project. Each chat message triggers a four-tier memory bundle before the LLM prompt is assembled:

| Tier              | Source                                                   | Cache TTL |
| ----------------- | -------------------------------------------------------- | --------- |
| Short-term        | Cached conversation summaries                            | Session   |
| Semantic          | 384-dim vector similarity search (sentence-transformers) | —         |
| Emotional Profile | 30-day rolling emotion aggregation                       | 12 hours  |
| Meta-Reflections  | Journal + conversation pattern synthesis                 | 2 days    |

The LLM receives all four tiers as structured context, allowing responses that reference past emotional states, recurring themes, and long-term patterns — not just the last few messages.

---

## Crisis Detection

Crisis assessment runs as the **first step** in every request, before any LLM call. It uses a keyword-based engine (intentionally conservative — high precision over recall) that classifies severity and immediately returns appropriate resources (988, 741741, 911) if triggered. The conversation terminates at that point; no LLM response is generated. Crisis events are logged to a dedicated table with severity, keywords detected, and acknowledgement state.

---

## Chat Flow

![Chat Message Flow](./frontend/public/docs/serenity-dark-02-chat-flow.svg)

Full pipeline: User input → Crisis assessment → ConversationService → EmotionService → ContextManager → Memory bundle (4 tiers) → LLM prompt assembly → Ollama API → Save to DB → Background tasks → Typewriter display.

---

## Tech Stack

| Layer      | Technology                                                                           |
| ---------- | ------------------------------------------------------------------------------------ |
| Frontend   | React 19, Vite 7, CSS Modules, Framer Motion, GSAP, Lenis                            |
| Backend    | Python, FastAPI, Uvicorn, SQLAlchemy 2.0 async, Pydantic 2.5                         |
| Database   | PostgreSQL 15, Alembic, asyncpg                                                      |
| AI         | Ollama Cloud (gpt-oss:120b-cloud), sentence-transformers (384-dim), XLNet (optional) |
| Auth       | JWT (HS256), bcrypt, PyJWT                                                           |
| Deployment | Vercel, Railway, Supabase                                                            |
| Dev        | Docker Compose, pgAdmin 4                                                            |

---

## Running Locally

**Prerequisites:** Docker, Docker Compose

```bash
git clone https://github.com/Luc0-0/Serenity-Multi-Modal-Mental-Assistant-System
cd Serenity-Multi-Modal-Mental-Assistant-System
```

Copy the environment file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Required variables:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/serenity
SECRET_KEY=your-secret-key
OLLAMA_API_KEY=your-ollama-api-key
OLLAMA_BASE_URL=https://ollama.com/v1
```

Start all services:

```bash
docker-compose up --build
```

| Service     | URL                        |
| ----------- | -------------------------- |
| Frontend    | http://localhost:5173      |
| Backend API | http://localhost:8000      |
| API Docs    | http://localhost:8000/docs |
| pgAdmin     | http://localhost:5050      |

Run database migrations:

```bash
docker exec -it serenity-backend alembic upgrade head
```

---

## Project Structure

```
Serenity/
├── frontend/
│   ├── src/
│   │   ├── pages/           # CheckIn, Journal, Insights, Meditate, Profile
│   │   ├── components/      # CrisisAlert, SerenityDeck, CustomCursor, Toast
│   │   ├── context/         # AuthContext, ChatContext, NotificationContext
│   │   └── services/        # api.js, emotionService.js, journalService.js
│   └── public/docs/         # Architecture diagrams
├── backend/
│   └── app/
│       ├── routers/         # auth, chat, conversations, emotions, journal
│       ├── services/        # LLM, emotion, memory, crisis, journal, context
│       └── services/engines/
│           ├── emotion/     # keywords.py, xlnet.py
│           ├── llm/         # ollama.py, fallback.py
│           └── crisis/      # keywords.py
└── docker-compose.yml
```

---

## API Endpoints

| Method | Endpoint                  | Description                       |
| ------ | ------------------------- | --------------------------------- |
| POST   | `/api/auth/signup`        | Register                          |
| POST   | `/api/auth/login`         | Login, returns JWT                |
| POST   | `/api/chat`               | Send message, returns AI response |
| GET    | `/api/conversations`      | List user conversations           |
| GET    | `/api/emotions/analytics` | Emotion trend data                |
| GET    | `/api/journal`            | Journal entries                   |
| POST   | `/api/journal`            | Create journal entry              |
| GET    | `/health`                 | Health check                      |

---

## Status

Deployed and functional. Actively in development — XLNet as default emotion engine, Insights page visualisations, and mobile polish are currently in progress. Planned features include voice input, wearable integration, and a therapist portal.

![Feature Status](./frontend/public/docs/serenity-dark-05-feature-status.svg)

---

## License

AGPL-3.0 — see [LICENSE](./LICENSE)

---

**Nipun Sujesh**
BTech — Artificial Intelligence & Data Science
[nipunsujesh28@gmail.com](mailto:nipunsujesh28@gmail.com) · [GitHub](https://github.com/Luc0-0) · [Portfolio](https://nipun.space)
