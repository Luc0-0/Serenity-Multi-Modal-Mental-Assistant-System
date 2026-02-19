# Crisis Service Deployment Guide

**Quick deployment steps for Phase 3 Step 4**

## Step 1: Verify Implementation

```bash
cd backend
python verify_crisis_implementation.py
```

Expected output:
```
✅ VERIFICATION COMPLETE - ALL SYSTEMS READY
  ✓ 145 keywords across 3 severity levels
  ✓ Multi-level severity detection
  ✓ Emotion context integration
  ✓ Professional resource database
  ✓ Non-blocking architecture
  ✓ Event tracking for trends
```

## Step 2: Run Tests

```bash
python test_crisis_service.py
```

Expected output:
```
✅ ALL TESTS PASSED
[TEST 1] Normal Messages: 4/4 ✓
[TEST 2] Warning Messages: 4/4 ✓
[TEST 3] Danger Messages: 5/5 ✓
[TEST 4] Emergency Messages: 5/5 ✓
[TEST 5] Emotion Context Boost: ✓
[TEST 6] Response Generation: ✓
[TEST 7] Resource Retrieval: ✓
[TEST 8] Multiple Keywords: ✓
[TEST 9] Severity Comparison: ✓
[TEST 10] Service Statistics: ✓
[TEST 11] Edge Cases: 4/4 ✓
```

## Step 3: Apply Database Migration

```bash
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade add_ids_journal -> add_crisis_events
INFO  [alembic.ddl.impl.postgresql] CREATE TABLE crisis_events
```

## Step 4: Verify Database

```bash
python check_database.py
```

Should show:
```
Crisis Events: 0  (initially)
```

## Step 5: Start Backend Server

```bash
python -m uvicorn app.main:app --reload
```

## Step 6: Test via Swagger

1. Open: http://localhost:8000/docs
2. Click: POST /api/chat/
3. Click: "Try it out"
4. Send a **warning message**:
   ```json
   {
     "user_id": 1,
     "message": "I'm feeling really overwhelmed lately with everything happening in my life",
     "conversation_id": null
   }
   ```
5. Verify response includes:
   - `crisis_detected: false` (warning is not escalation)
   - OR `crisis_detected: true` if you use a danger/emergency keyword

## Step 7: Test Crisis Escalation

Send a **danger message**:
```json
{
  "user_id": 1,
  "message": "I want to hurt myself and don't know what to do",
  "conversation_id": null
}
```

Verify response includes:
- `crisis_detected: true`
- `crisis_severity: "danger"`
- `resources`: Array of professional resources (Lifeline 988, Crisis Text Line, etc.)

## Step 8: Check Database Logs

```bash
python check_database.py
```

Should now show:
```
Crisis Events: 1
[EVENT ID] Severity: danger, Confidence: 0.85
  Keywords: ['hurt myself']
```

## Troubleshooting

### Migration Failed
```bash
# Check current migration status
alembic current

# Upgrade all pending migrations
alembic upgrade head
```

### Tests Failing
```bash
# Run with verbose output
python test_crisis_service.py 2>&1 | grep -A5 "FAILED"

# Check imports
python -c "from app.services.crisis_service import CrisisService"
```

### Server won't start
```bash
# Check for syntax errors
python -m py_compile app/services/crisis_service.py
python -m py_compile app/routers/chat.py
python -m py_compile app/models/crisis_event.py
```

## Files Changed/Added

### New Files
- ✅ `app/services/crisis_service.py`
- ✅ `app/models/crisis_event.py`
- ✅ `alembic/versions/add_crisis_events_table.py`
- ✅ `test_crisis_service.py`
- ✅ `verify_crisis_implementation.py`
- ✅ `PHASE_3_STEP_4_IMPLEMENTATION.md`

### Modified Files
- ✅ `app/routers/chat.py` (added crisis service integration)
- ✅ `app/schemas/chat.py` (added crisis response fields)

## Rollback (if needed)

```bash
# Downgrade migration
alembic downgrade -1

# This will:
# - Drop crisis_events table
# - Restore chat.py and chat.py to previous state
```

## Production Considerations

1. **Rate Limiting**: Consider rate-limiting crisis detection on high-volume servers
2. **Logging**: Crisis events logged to database for audit trail
3. **Privacy**: Crisis events include keywords - handle with care
4. **Monitoring**: Set up alerts for "emergency" severity detections
5. **Redundancy**: Ensure database is backed up regularly

## API Response Example

### Normal Message (No Crisis)
```json
{
  "reply": "I hear you. That sounds like...",
  "conversation_id": 12,
  "message_id": 20,
  "crisis_detected": false
}
```

### Crisis Message (Escalation)
```json
{
  "reply": "I'm genuinely concerned about your safety...",
  "conversation_id": 13,
  "message_id": 21,
  "crisis_detected": true,
  "crisis_severity": "danger",
  "resources": [
    {
      "name": "National Suicide Prevention Lifeline",
      "phone": "988",
      "text": "Text 'HELLO' to 741741",
      "url": "https://suicidepreventionlifeline.org",
      "type": "crisis",
      "available": "24/7"
    },
    ...
  ]
}
```

## Success Indicators

✅ All tests pass  
✅ Migration applies cleanly  
✅ Database schema correct  
✅ Swagger shows new response fields  
✅ Warning messages detected  
✅ Danger messages detected  
✅ Emergency messages detected  
✅ Resources returned correctly  
✅ Crisis events logged  
✅ No errors in server logs  

---

**Once you complete these steps, Phase 3 Step 4 is complete and deployed.**

Next: Phase 3 Step 5 (Frontend Integration)
