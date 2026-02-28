# API Changes Summary

## Overview
Changed all frontend API calls to include `/api/` prefix in the path itself (not in the base URL).

**Pattern Change:**
- **Before:** `apiClient.get("/journal")` + `API_BASE_URL = http://localhost:8000/api`
- **After:** `apiClient.get("/api/journal")` + `API_BASE_URL = http://localhost:8000`

---

## Files Modified: 7

### 1. **frontend/src/services/journalService.js**

**Journal Service:**
```javascript
// BEFORE
const JOURNAL_BASE = '/journal';
journalService.listEntries() → apiClient.get(`${JOURNAL_BASE}/entries/`)
// Call: /journal/entries/

// AFTER
const JOURNAL_BASE = '/api/journal';
journalService.listEntries() → apiClient.get(`${JOURNAL_BASE}/entries/`)
// Call: /api/journal/entries/
```

**All Journal Endpoints:**
| Endpoint | Before | After |
|----------|--------|-------|
| List entries | `/journal/entries/` | `/api/journal/entries/` |
| Create entry | `/journal/entries/` | `/api/journal/entries/` |
| Get entry | `/journal/entries/{id}/` | `/api/journal/entries/{id}/` |
| Update entry | `/journal/entries/{id}/` | `/api/journal/entries/{id}/` |
| Delete entry | `/journal/entries/{id}/` | `/api/journal/entries/{id}/` |
| Search entries | `/journal/search/` | `/api/journal/search/` |

**Insights Service (in journalService.js):**
| Endpoint | Before | After |
|----------|--------|-------|
| Get insights | `/emotions/insights/` | `/api/emotions/insights/` |
| Get history | `/emotions/history/` | `/api/emotions/history/` |
| Get daily summary | `/emotions/daily-summary/` | `/api/emotions/daily-summary/` |

---

### 2. **frontend/src/services/emotionService.js**

**Emotion Endpoints:**
| Function | Endpoint | Before | After |
|----------|----------|--------|-------|
| fetchEmotionInsights() | Insights | `/emotions/insights/?days=...` | `/api/emotions/insights/?days=...` |
| fetchMiniEmotionSnapshot() | Mini | `/emotions/mini/?user_id=...` | `/api/emotions/mini/?user_id=...` |
| fetchEmotionHistory() | History | `/emotions/history/?user_id=...&range=...` | `/api/emotions/history/?user_id=...&range=...` |

---

### 3. **frontend/src/pages/Profile.jsx**

**Profile Page API Calls:**
| Function | Endpoint | Before | After |
|----------|----------|--------|-------|
| fetchProfileData() | Get profile | `/auth/profile/` | `/api/auth/profile/` |
| fetchProfileData() | Get insights | `/emotions/insights/?days=7` | `/api/emotions/insights/?days=7` |
| fetchProfileData() | Get journals | `/journal/entries/?limit=100` | `/api/journal/entries/?limit=100` |
| handleSaveProfile() | Update profile | `/auth/profile/` | `/api/auth/profile/` |
| handleDeleteAccount() | Delete account | `/auth/profile/` | `/api/auth/profile/` |

---

### 4. **frontend/src/services/apiClient.js**

**Base URL Configuration:**
```javascript
// BEFORE
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
// This had /api hardcoded

// AFTER
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// No /api suffix - services add it themselves
```

**Environment Variable:**
- `VITE_API_URL` should now be set to backend URL WITHOUT `/api`
- Example: `VITE_API_URL=http://serenity-backend:8000` (not with `/api`)

---

### 5. **docker-compose.yml**

**Frontend Service Configuration:**
```yaml
# BEFORE
VITE_API_URL: http://serenity-backend:8000

# AFTER  
VITE_API_URL: http://serenity-backend:8000
# (Same - already correct)
```

---

### 6. **backend/app/routers/chat.py**

**Crisis Detection Change:**
```python
# BEFORE
crisis_detected=insight.high_risk if insight else False,

# AFTER
actual_crisis = await main_app.emotion_service.detect_crisis_signals(request.message)
crisis_detected=actual_crisis,
```

**Backend still uses:**
- `POST /api/chat/` - Same endpoint
- Difference: Logic for when to trigger crisis mode

---

### 7. **backend/app/services/emotion_service.py**

**No endpoint changes - Logic changes only**
- Enhanced crisis keyword detection
- Removed false positives (sadness alone no longer triggers crisis)

---

## Complete API Endpoint Mapping

### Auth Endpoints
```
GET  /api/auth/profile/          (was /auth/profile/)
PUT  /api/auth/profile/          (was /auth/profile/)
DELETE /api/auth/profile/        (was /auth/profile/)
POST /api/auth/login/            (unchanged)
POST /api/auth/signup/           (unchanged)
```

### Chat Endpoints
```
POST /api/chat/                  (unchanged)
POST /api/chat/stream/           (unchanged)
```

### Conversations Endpoints
```
GET  /api/conversations/         (unchanged)
GET  /api/conversations/{id}/messages  (unchanged)
POST /api/conversations/{id}/finalize-title  (unchanged)
DELETE /api/conversations/{id}   (unchanged)
```

### Emotions Endpoints
```
GET /api/emotions/insights/      (was /emotions/insights/)
GET /api/emotions/history/       (was /emotions/history/)
GET /api/emotions/daily-summary/ (was /emotions/daily-summary/)
GET /api/emotions/mini/          (was /emotions/mini/)
```

### Journal Endpoints
```
GET    /api/journal/entries/     (was /journal/entries/)
POST   /api/journal/entries/     (was /journal/entries/)
GET    /api/journal/entries/{id}/ (was /journal/entries/{id}/)
PUT    /api/journal/entries/{id}/ (was /journal/entries/{id}/)
DELETE /api/journal/entries/{id}/ (was /journal/entries/{id}/)
GET    /api/journal/search/      (was /journal/search/)
```

---

## Impact Analysis

### ✅ What This Fixes
1. **Journal 404 Error** - Now calling `/api/journal/entries/` instead of `/journal/entries/`
2. **Emotion Endpoints** - All emotion calls now have `/api/` prefix
3. **Auth Endpoints** - Profile calls now have `/api/` prefix
4. **Consistency** - All frontend services follow same pattern

### ⚠️ Environment Variable Requirements

For this to work in production:
```
VITE_API_URL must NOT include /api

Production (Railway):
VITE_API_URL=https://serenity-backend-abc123.up.railway.app

Local (Docker):
VITE_API_URL=http://serenity-backend:8000

NOT:
VITE_API_URL=https://serenity-backend-abc123.up.railway.app/api  ❌
VITE_API_URL=http://serenity-backend:8000/api  ❌
```

### ✅ Already Correct (No Changes Needed)
- CheckIn.jsx - Already had `/api/` prefix
- ConversationSidebar.jsx - Already had `/api/` prefix  
- Insights.jsx - Already had `/api/` prefix
- API.js - Already had `/api/` prefix

---

## Testing Checklist

- [ ] Journal entries load without 404
- [ ] Profile data loads correctly
- [ ] Emotions/insights fetch without errors
- [ ] Chat messages send and receive responses
- [ ] All API calls have `/api/` in path
- [ ] `VITE_API_URL` environment variable set correctly (without `/api`)
- [ ] Sidebar conversations list displays
- [ ] Emotion data displays on insights page

---

## Deployment Instructions

1. **Before deploying**, verify `VITE_API_URL` is set correctly:
   ```
   // Railway frontend service settings
   VITE_API_URL=https://serenity-backend-xxxxxx.up.railway.app
   ```

2. **Rebuild frontend** - Railway will auto-rebuild when you push

3. **Test in production**:
   - Open Journal page → Should load without 404
   - Check browser Network tab → URLs should have `/api/` prefix
   - View Profile → Should load profile, insights, journals

---

## Rollback Instructions

If needed, revert:
```bash
git checkout backend/app/routers/chat.py \
             backend/app/services/emotion_service.py \
             frontend/src/pages/Journal.jsx \
             frontend/src/pages/Profile.jsx \
             frontend/src/services/apiClient.js \
             frontend/src/services/emotionService.js \
             frontend/src/services/journalService.js \
             docker-compose.yml
```
