# API URL Configuration - CORRECTED

## Architecture Decision

The application follows this pattern:
- **VITE_API_URL** = Backend base URL (WITHOUT /api)
- **Application code** = Adds `/api/` prefix when making requests

Example:
```
VITE_API_URL = http://serenity-backend:8000
journalService.listEntries() calls /api/journal/entries/
Full URL = http://serenity-backend:8000/api/journal/entries/
```

---

## Configuration by Environment

### Local Development (docker-compose)
```yaml
VITE_API_URL: http://serenity-backend:8000      # No /api
BACKEND_URL: http://serenity-backend:8000       # No /api
```

### Production (Railway)
Set these environment variables on the FRONTEND service:
```
VITE_API_URL=https://[your-backend-url].up.railway.app
VITE_BACKEND_URL=https://[your-backend-url].up.railway.app
```

**Example**: If backend is at `https://serenity-backend-abc123.up.railway.app`
```
VITE_API_URL=https://serenity-backend-abc123.up.railway.app
```

---

## What Was Fixed

All frontend API calls now properly include `/api/` prefix:

### Services Fixed:
1. **journalService.js**
   - JOURNAL_BASE: `/journal` → `/api/journal`
   - insightsService: `/emotions/insights` → `/api/emotions/insights`
   - insightsService: `/emotions/history` → `/api/emotions/history`
   - insightsService: `/emotions/daily-summary` → `/api/emotions/daily-summary`

2. **emotionService.js**
   - `/emotions/insights` → `/api/emotions/insights`
   - `/emotions/mini` → `/api/emotions/mini`
   - `/emotions/history` → `/api/emotions/history`

3. **Profile.jsx**
   - `/auth/profile` → `/api/auth/profile`
   - `/emotions/insights` → `/api/emotions/insights`
   - `/journal/entries` → `/api/journal/entries`

4. **apiClient.js**
   - Removed hardcoded `/api` from base URL
   - Now returns: `http://localhost:8000` (dev) or backend domain (prod)

---

## How It Works Now

1. Frontend environment variables:
   ```
   VITE_API_URL=http://localhost:8000    (no /api)
   ```

2. apiClient.js constructs:
   ```javascript
   API_BASE_URL = http://localhost:8000
   ```

3. Services call with `/api/` prefix:
   ```javascript
   journalService.listEntries()
   → apiClient.get(`${JOURNAL_BASE}/entries/`)
   → apiClient.get(`/api/journal/entries/`)
   → Final URL: http://localhost:8000/api/journal/entries/
   ```

4. Backend receives at `/api/journal/entries/` ✓

---

## Deployment Steps

1. **Find your backend URL** on Railway
2. **Set frontend environment variable**:
   ```
   VITE_API_URL=https://your-backend-url.up.railway.app
   ```
3. **Rebuild** frontend (Railway will auto-detect env change)
4. **Test** by checking browser console for correct URLs

---

## Debugging

Check browser console (F12):
```
[API Client] Configured with base URL: http://localhost:8000
```

Check Network tab for actual requests:
- Should see: `http://localhost:8000/api/journal/entries/?...`
- NOT: `http://localhost:8000/journal/entries/?...`
- NOT: `http://localhost:8000/api/api/journal/entries/?...` (double /api/)
