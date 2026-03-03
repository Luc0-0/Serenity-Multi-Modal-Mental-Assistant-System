# Serenity Backend Documentation

## Overview
Serenity's backend is a high-performance, asynchronous REST API built with **FastAPI**. It powers the mental health companion application by handling user authentication, emotional analysis, journaling, and AI-driven conversations.

## Technology Stack
- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL (Async via `asyncpg`, ORM via `SQLAlchemy 2.0`)
- **Migrations**: Alembic
- **Authentication**: JWT (JSON Web Tokens) with `python-jose` and `passlib`
- **AI/ML**: 
  - `transformers` (HuggingFace) for local emotion analysis (optional/fallback)
  - `ollama` integration for LLM capabilities
- **Containerization**: Docker & Docker Compose

## Project Structure
```
backend/
├── app/
│   ├── core/           # Config, security, exceptions
│   ├── db/             # Database connection and base models
│   ├── models/         # SQLAlchemy database models
│   ├── routers/        # API endpoints (Auth, Chat, Journal, etc.)
│   ├── schemas/        # Pydantic models for request/response validation
│   ├── services/       # Business logic (AI service, CRUD wrappers)
│   └── main.py         # Application entry point
├── alembic/            # Database migration scripts
├── tests/              # Pytest suites
├── Dockerfile          # Backend container definition
└── requirements.txt    # Python dependencies
```

## Key Features
1.  **Authentication**: Secure signup/login with hashed passwords and JWT access tokens.
2.  **Emotion Tracking**: Logs user emotions and analyzes trends.
3.  **Journaling**: Encrypted personal journal entries.
4.  **AI Chat**: Context-aware conversations using local LLMs (Ollama) or fallback mechanisms.
5.  **Crisis Detection**: Logic to detect crisis keywords in user input.

## Setup & Installation

### Prerequisites
- Docker Desktop installed and running.
- Python 3.10+ (for local non-Docker runs).

### Running with Docker (Recommended)
The backend is part of the main `docker-compose` setup.
```bash
# from project root
docker-compose --env-file .env.docker up backend
```
This starts:
- PostgreSQL database
- PGAdmin (Database UI)
- Backend API (available at `http://localhost:8000`)

### Local Development (Without Docker)
1.  **Create Virtual Environment**:
    ```bash
    cd backend
    python -m venv .venv
    source .venv/bin/activate  # or .venv\Scripts\activate on Windows
    ```
2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Configure Environment**:
    Copy `.env.example` to `.env` and update database credentials.
4.  **Run Migrations**:
    ```bash
    alembic upgrade head
    ```
5.  **Start Server**:
    ```bash
    uvicorn app.main:app --reload
    ```

## API Documentation
Once running, interactive API docs are available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Database
- **Engine**: PostgreSQL
- **Default Database**: `serenity_db`
- **Management**: Access via PGAdmin at `http://localhost:5050`
    - **Email**: `admin@admin.com`
    - **Password**: `admin`

## Testing
Run the test suite using `pytest`:
```bash
pytest
```
