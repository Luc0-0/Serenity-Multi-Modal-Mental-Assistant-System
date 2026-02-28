# Serenity System Investigation Report

## Overview
Analyzed the entire flow of conversation creation, message persistence, and retrieval to understand the "responses disappearing" issue.

---

## Architecture Flow

### 1. MESSAGE SENDING FLOW (Chat Endpoint)
```
User sends message → chat_endpoint() → conversation created/validated
    ↓
Save user message to DB → db.commit() ✓
    ↓
Get conversation history → context_manager.get_optimized_history() 
    ↓
Generate LLM response
    ↓
Save assistant message to DB → db.commit() ✓
    ↓
Return ChatResponse to frontend
    ↓
Background task: post_process_chat_async() (title, memory, etc.)
```

**Key Points:**
- User message saved and committed (line 191-194)
- Assistant response saved and committed (line 257-260)
- Both use `await db.commit()` before returning response
- Background tasks run AFTER response is sent

---

### 2. MESSAGE RETRIEVAL FLOW (Conversations Endpoint)
```
Frontend requests /api/conversations/{id}/messages
    ↓
Backend queries Message table ordered by created_at.asc()
    ↓
Returns formatted messages
```

**Code Location:** `backend/app/routers/conversations.py:48-91`

---

## DATABASE SCHEMA

### Messages Table
```python
class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(Enum(MessageRole))
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
```

**Key Observation:** `created_at` has `server_default=func.now()` - timestamp set by database, not application.

---

## IDENTIFIED POTENTIAL ISSUES

### Issue 1: Database Transaction Isolation
**Location:** `backend/app/routers/chat.py` lines 191-260

**Flow:**
```python
# Save user message
user_message_id = await conversation_service.save_message(...)
await db.commit()  # ✓ Committed

# Get conversation history (uses same session!)
history = await context_manager.get_optimized_history(db, conversation_id)

# Generate response
reply = await main_app.llm_service.get_response(...)

# Save assistant message
assistant_message_id = await conversation_service.save_message(...)
await db.commit()  # ✓ Committed
```

**Potential Problem:**
- Between user message commit and fetching history, the database session is reused
- If the context manager queries before the commit is fully replicated across replicas (in production), it might miss the user message
- However, `await db.commit()` is called BEFORE `get_optimized_history()`, so this should be fine

---

### Issue 2: Message Role Enum Serialization
**Location:** `backend/app/models/message.py:19`

```python
role = Column(Enum(MessageRole), nullable=False)
```

**Potential Problem in Responses:**
- In `conversations.py:80`, messages are returned as:
```python
"role": m.role  # This is an Enum object, not a string!
```

**Should be:**
```python
"role": m.role.value  # Convert to string
```

**Evidence:** Frontend expects string: `msg.role === "assistant"` (CheckIn.jsx:236)

---

### Issue 3: Context Manager Summary Format
**Location:** `backend/app/services/context_manager.py:140-142`

```python
return {
    "role": "system",
    "content": f"[CONTEXT SUMMARY] {summary}"
}
```

**Potential Problem:**
- Summary message has `role: "system"` which might be filtered out by frontend
- Frontend may only display "user" and "assistant" messages
- Summary is useful context but won't show up in conversation UI

---

### Issue 4: Frontend LocalStorage vs Database
**Location:** `frontend/src/pages/CheckIn.jsx:23`

```javascript
const [messages, setMessages] = useState([]);
```

**Flow:**
1. User sends message
2. Frontend appends to local state
3. Returns response from backend
4. Frontend appends response to local state
5. **User refreshes page**
6. `onSelectConversation()` fetches from DB (CheckIn.jsx:226-240)

**Potential Problem:**
- `setMessages()` is only set from API response, not persisted to localStorage
- On refresh, need to call `/api/conversations/{id}/messages`
- If that endpoint fails or returns empty, messages disappear

---

### Issue 5: Message Save Timing
**Location:** `backend/app/routers/chat.py:257-260`

```python
assistant_message_id = await conversation_service.save_message(
    db, conversation_id, "assistant", reply
)
await db.commit()
```

**Question:** 
- `save_message()` does `db.add()` and `db.flush()` but NOT `db.commit()`
- The COMMIT happens after in line 260
- If connection drops between save and commit → message lost

**Current implementation:** Looks safe because commit is called immediately

---

## JOURNAL 404 ROOT CAUSE

**Confirmed Issue:** Missing `/api/` prefix in API calls

**Evidence from Console Error:**
```
Failed to load resource: the server responded with a status of 404 ()
serenity-frontend-production-a34e.up.railway.app/journal/entries/?skip=0&limit=50
```

Notice: URL goes directly to `/journal/entries/` instead of `/api/journal/entries/`

**Root Cause:** 
1. `VITE_API_URL` not set on Railway frontend service
2. Defaults to `'http://localhost:8000/api'` (see line 1 of old apiClient.js)
3. But frontend might be using old code that hardcoded paths without `/api`

**Status:** Fixed by adding `/api/` prefix throughout services

---

## RESPONSES DISAPPEARING - ROOT CAUSE ANALYSIS

### Scenario: User loses messages after refresh

**Probable Causes (in order of likelihood):**

1. **Enum Serialization Bug** (MOST LIKELY)
   - Backend returns `"role": Enum` instead of `"role": "string"`
   - Frontend might filter/reject invalid message format
   - Result: Conversation appears empty
   
2. **Empty History on Fetch**
   - User refreshes immediately after sending message
   - Message commit hasn't replicated to read replica (if using one)
   - API returns empty message list
   - Frontend shows empty conversation
   
3. **Authentication Timeout**
   - Auth token expires during long conversation
   - Frontend fails silently when fetching message history
   - User sees empty conversation
   
4. **Database Connection Pool Issues**
   - Long-running connection uses outdated session
   - Doesn't see newly committed messages
   - Typical with SQLAlchemy if connection isn't properly recycled

---

## CRITICAL POINTS TO CHECK IN PRODUCTION

### 1. Check Enum Serialization
```bash
curl -H "Authorization: Bearer <token>" \
  https://serenity-backend/api/conversations/123/messages | jq '.messages[0].role'
```

Should return: `"user"` (string)
Not: `{"_name_": "user"}` (Enum dict)

### 2. Check Conversation History on Refresh
```
1. Send message → see it in chat
2. Refresh page
3. Check Network tab for /api/conversations/{id}/messages request
4. Does it return the message just sent?
```

### 3. Check Database Replication
```bash
# In production, verify:
- Write database: Can query new messages immediately
- Read database: Can query new messages (if using read replicas)
```

### 4. Check Session/Connection Lifecycle
```python
# In ChatContext or storage, verify:
- Conversation ID is saved
- When user returns, correct ID is used
- History is fetched with correct conversation ID
```

---

## CODE PATTERNS THAT WORK CORRECTLY

✅ **Message Saving:**
```python
# Proper pattern used:
message = Message(...)
db.add(message)
await db.flush()  # Get ID
message_id = message.id
# Later...
await db.commit()  # Persist to DB
```

✅ **Context Manager:**
```python
# Properly queries database
result = await db.execute(
    select(Message)
    .where(Message.conversation_id == conversation_id)
    .order_by(Message.created_at.asc())
)
messages = result.scalars().all()
```

✅ **Conversation History Retrieval:**
```python
# Properly formats and returns
"role": message.role.value,  # ✓ Converts Enum to string
"content": message.content
```

---

## POTENTIAL FIXES (Not Applied - Investigation Only)

### Fix 1: Enum Serialization in conversations.py
```python
# Line 80 - Change from:
"role": m.role
# To:
"role": m.role.value
```

### Fix 2: Add retry logic for history fetch
```python
# In CheckIn.jsx - Add timeout/retry
try {
    const response = await fetch(...);
    if (!response.ok && response.status === 500) {
        // Retry once
        await new Promise(r => setTimeout(r, 1000));
        return fetch(...);
    }
}
```

### Fix 3: Validate message format before displaying
```javascript
// Validate before setState
const validMessages = messages.filter(m => 
    ['user', 'assistant', 'system'].includes(m.role)
);
```

---

## DEPLOYMENT CHECKLIST

- [ ] Verify `VITE_API_URL` set on Railway frontend (should be backend URL without `/api`)
- [ ] Check database connection pooling settings
- [ ] Verify read/write replica consistency (if using)
- [ ] Test message persistence on production database
- [ ] Check for Enum serialization in API responses
- [ ] Verify authentication token doesn't expire during conversations
- [ ] Test refresh during active conversation

---

## SUMMARY

**Crisis Detection:** ✅ FIXED - Only actual keywords trigger crisis mode

**Journal 404:** ✅ FIXED - Added `/api/` prefix to all service calls

**Responses Disappearing:** ⚠️ LIKELY CAUSES IDENTIFIED
1. **Most Likely:** Enum serialization bug in conversations endpoint
2. **Possible:** Database replication lag
3. **Possible:** Auth timeout during conversation
4. **Possible:** Connection pool not recycling properly

**Recommendation:** Check for Enum serialization first, then test message persistence on production database
