# Serenity Backend (FastAPI)

Mental health companion API using FastAPI + Python.

## Setup

### 1. Create virtual environment
```bash
python -m venv .venv
```

### 2. Activate (Windows)
```bash
.venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Create .env file
```bash
cp .env.example .env
```

Add Ollama Cloud credentials:
```
OLLAMA_ENDPOINT=https://your-ollama-cloud-endpoint.com
OLLAMA_API_KEY=your_api_key_here
DEBUG=True
```

### 5. Run server
```bash
uvicorn app.main:app --reload
```

Server runs on `http://127.0.0.1:8000`

### 6. API Docs
```
http://127.0.0.1:8000/docs
```

## API Endpoints
- `GET /health` - Health check
- `POST /api/chat` - Chat endpoint (uses Ollama Cloud LLM)

## Structure
```
app/
├── main.py           # FastAPI app
├── config.py         # Settings
├── routers/
│   ├── health.py
│   └── chat.py
└── services/
    └── llm_service.py
```
