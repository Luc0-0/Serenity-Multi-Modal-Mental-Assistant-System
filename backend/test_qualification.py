#!/usr/bin/env python3

message = "Today was really tough. I've been feeling anxious and sad about everything happening around me. I realized that I need to work through these feelings and maybe seek some support. Reflecting on my day, I see that stress is affecting my sleep."

REFLECTION_MARKERS = [
    "i feel", "i felt", "i have been", "i've been",
    "lately", "recently", "because", "i think", "i realize",
    "i noticed", "i'm struggling", "i'm dealing with"
]

STRONG_EMOTIONS = [
    "sad", "depressed", "anxious", "overwhelmed", "stressed",
    "devastated", "heartbroken", "angry", "frustrated", "scared"
]

print(f'Message length: {len(message)}')
print(f'Min required: 100')

has_marker = any(m in message.lower() for m in REFLECTION_MARKERS)
print(f'Has reflection marker: {has_marker}')

has_emotion = any(e in message.lower() for e in STRONG_EMOTIONS)
print(f'Has strong emotion: {has_emotion}')

is_question = message.strip().endswith("?")
print(f'Ends with question: {is_question}')

# Should qualify because it has both markers and emotions
should_qualify = (len(message) >= 100) and (has_marker or has_emotion or is_question)
print(f'\nShould create entry: {should_qualify}')
