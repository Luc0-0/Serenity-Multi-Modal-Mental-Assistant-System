# Conversation Context Optimization

## Problem
Long conversations send entire history to Ollama API every request:
- 34 messages × 400+ chars = 13,600+ chars per request
- Model gets confused by old context (70% of tokens wasted)
- Slow response times, high API costs
- Model regresses to patterns from early conversation

## Solution: Hierarchical Context Management

**New architecture (3-tier system):**

```
┌─────────────────────────────────────────────┐
│ Recent Messages (Last 5) - FULL DETAIL     │  ← Most important
│ - Current context, immediate relevance     │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Important Older Messages (2) - FULL DETAIL  │  ← Scored by:
│ - Emotional context, turn variance          │     • Length
│ - High-information content                  │     • Emotional keywords
│                                              │     • Role (assistant > user)
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Summary of Very Old Messages                │  ← Compressed
│ - 1 system message with key facts           │
│ - Reduces token bloat by 60-80%             │
└─────────────────────────────────────────────┘
```

## Results

**Before:**
- 34 total messages
- All 34 sent to API
- ~13,600 chars per request
- Model confused by old patterns

**After:**
- 34 total messages  
- Send: 5 recent + 2 important + 1 summary = **8 effective messages**
- ~3,200 chars per request (~75% token reduction)
- Model focuses on current context
- Faster responses, lower cost

## Implementation

New service: `app/services/context_manager.py`
- `ContextManager.get_optimized_history()` - Smart history retrieval
- Importance scoring algorithm
- Automatic summarization of old context

Updated: `app/routers/chat.py`
- Both regular and streaming endpoints use optimized history
- Logging shows context structure

## Configuration

Adjust in `context_manager.py`:
```python
self.recent_limit = 5        # Last N messages (full)
self.important_limit = 2     # Important older messages
self.summary_threshold = 15  # Summarize if > N total
```

## Monitoring

Check server logs for context optimization:
```
[CONTEXT] Total messages: 34
[CONTEXT] Structure: summary(of 27) + 2 important + 5 recent = 8 total
[CONTEXT] Using recent 5 messages
```

## Future Enhancements

1. **Vector similarity scoring** - Find semantically relevant messages
2. **User preference memory** - Store facts about user separately
3. **Topic detection** - Group messages by topic, retrieve by relevance
4. **Adaptive thresholds** - Adjust based on conversation complexity

## References

Research-backed approach:
- Mem0 memory formation (80-90% token reduction)
- Contextual summarization (production standard)
- Importance-based pruning (academic best practices)
