# Serenity Deployment Fixes

## Issues Fixed

### 1. ✅ False Crisis Detection (CRITICAL)
**Problem**: System was flagging normal sadness as "crisis" and returning crisis response instead of normal LLM response.

**Root Cause**: Used `insight.high_risk` flag which is based on emotion distribution and crisis event count, not actual crisis keywords. A user expressing sadness (50%+ sadness emotion) would trigger the crisis path.

**Fix Applied**:
- Modified `/backend/app/routers/chat.py` (2 locations):
  - Changed from `crisis_detected=insight.high_risk` to `crisis_detected=actual_crisis`
  - Added `actual_crisis = await main_app.emotion_service.detect_crisis_signals(request.message)`
- This ensures only ACTUAL crisis keywords trigger the crisis response

**Enhanced Crisis Keywords** in `/backend/app/services/emotion_service.py`:
- Only detects: suicide keywords, self-harm language, "want to die", etc.
- Does NOT flag sadness, stress, or other emotions as crisis
- User saying "I'm sad" will now get a normal supportive response, not a crisis escalation

---

### 2. ⚠️ Journal 404 Error - API Configuration Issue
**Problem**: Frontend getting 404 when fetching journal entries from `/journal/entries/`

**Root Cause**: Missing or incorrect `VITE_API_URL` environment variable in production. Frontend is sending requests to wrong domain.

**Temporary Fix Applied**:
- Enhanced API client in `frontend/src/services/apiClient.js` to:
  - First check `VITE_API_URL` environment variable
  - Then check `VITE_BACKEND_URL` environment variable  
  - Fall back to detecting backend from hostname (replaces 'frontend' with 'backend')
  - Added debug logging to show which URL is being used

**Permanent Fix - REQUIRED ACTION**:
In Railway dashboard, set these environment variables for the FRONTEND service:

```
VITE_API_URL=https://your-backend-url.railway.app/api
```

Or at minimum:
```
VITE_BACKEND_URL=https://your-backend-url.railway.app
```

---

### 3. ⚠️ Responses Disappearing After Refresh - Database Issue
**Problem**: Conversation responses aren't persisting to database

**Verification Done**: 
- Database commits are in place in chat router (line 260)
- Message save function appears to be working

**Likely Causes to Check**:
1. Database connection issues in production
2. Transaction isolation issues
3. The background task is failing silently

**Recommended Debug Steps**:
```bash
# Check backend logs for database errors
# Look for: "Failed to save message", "DB commit error", etc.
docker logs <backend-service-name>

# Verify database is working
# Test: Create new message -> Check database directly
```

**Temporary Workaround**: 
- Added better error logging in Journal.jsx to show error messages

---

## Deployment Checklist

### Backend (.env or Railway Variables)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `LLM_PROVIDER` - Set to your LLM provider (ollama, groq, etc)
- [ ] `CORS_ORIGINS` - Frontend domain(s)

### Frontend (Railway Build Variables)
- [ ] `VITE_API_URL` - Set to backend URL (e.g., `https://backend.railway.app/api`)
- [ ] `VITE_BACKEND_URL` - Alternative, backend base URL

### Railway Networking
If using Railway's internal networking:
- [ ] Both services are in same project
- [ ] Check Railway's variables section - may have auto-generated internal URLs
- [ ] Backend should be accessible via `http://backend:8000/api` internally

---

## Testing the Fixes

### Test 1: Crisis Detection
1. Send message: "I'm really sad today"
2. Expected: Normal supportive response (NOT crisis message)
3. Send message: "I want to kill myself"  
4. Expected: Crisis response with hotline numbers

### Test 2: Journal Endpoints
1. Check browser console Network tab for journal requests
2. Verify requests go to `/api/journal/entries/` not `/journal/entries/`
3. If 404 still occurs, check:
   - `apiClient.js` console debug message for configured URL
   - Browser shows correct domain in request

### Test 3: Data Persistence
1. Send a message
2. Refresh the page
3. Conversation should still be visible
4. Check backend logs for errors

---

## Code Changes Summary

**Files Modified**:
1. `backend/app/routers/chat.py` - Fixed crisis detection logic (2 places)
2. `backend/app/services/emotion_service.py` - Improved crisis keyword detection
3. `frontend/src/services/apiClient.js` - Better API URL handling
4. `frontend/src/pages/Journal.jsx` - Better error messages

---

## Next Steps

1. **Immediate**: Set `VITE_API_URL` in Railway frontend environment variables
2. **Test**: Verify crisis detection fix works (send sad message vs suicide keyword)
3. **Monitor**: Check backend logs for database/persistence issues
4. **Verify**: Test journal entries load without 404
