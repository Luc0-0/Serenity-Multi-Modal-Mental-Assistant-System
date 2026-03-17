VALID_EMOTIONS = {"sadness", "joy", "fear", "anger", "surprise", "disgust", "neutral"}

EMOTION_ALIASES = {
    # Fear / Anxiety
    "anxious": "fear",
    "anxiety": "fear",
    "worried": "fear",
    "overwhelmed": "fear",
    "scared": "fear",
    "nervous": "fear",
    "panic": "fear",
    "dread": "fear",
    "stressed": "fear",
    "fearful": "fear",

    # Joy / Happy
    "happy": "joy",
    "grateful": "joy",
    "excited": "joy",
    "joyful": "joy",
    "delighted": "joy",
    "pleased": "joy",
    "wonderful": "joy",
    "great": "joy",
    "awesome": "joy",
    "love": "joy",
    "blessed": "joy",
    "thrilled": "joy",
    "proud": "joy",

    # Sadness / Depressed
    "sad": "sadness",
    "lonely": "sadness",
    "hopeless": "sadness",
    "depressed": "sadness",
    "down": "sadness",
    "blue": "sadness",
    "miserable": "sadness",
    "unhappy": "sadness",
    "devastated": "sadness",
    "heartbroken": "sadness",
    "grief": "sadness",
    "sorrowful": "sadness",
    "melancholy": "sadness",
    "gloomy": "sadness",
    "alone": "sadness",

    # Anger / Frustration
    "angry": "anger",
    "furious": "anger",
    "rage": "anger",
    "frustrated": "anger",
    "irritated": "anger",
    "annoyed": "anger",
    "mad": "anger",
    "enraged": "anger",
    "livid": "anger",
    "outraged": "anger",
    "pissed": "anger",

    # Surprise
    "shocked": "surprise",
    "stunned": "surprise",
    "amazed": "surprise",
    "astonished": "surprise",
    "surprised": "surprise",
    "startled": "surprise",

    # Disgust
    "disgusted": "disgust",
    "repulsed": "disgust",
    "gross": "disgust",
    "nasty": "disgust",
    "yuck": "disgust",
    "revolted": "disgust",
    "sick": "disgust",

    # Trust / Calm
    "calm": "neutral",
    "trust": "neutral",
    "anticipation": "neutral",
}

def normalize_emotion(raw_label: str) -> str:
    """Normalizes a raw emotion string into a canonical VALID_EMOTION."""
    if not raw_label:
        return "neutral"
    
    label = raw_label.lower().strip()
    
    if label in VALID_EMOTIONS:
        return label
        
    # Check aliases
    if label in EMOTION_ALIASES:
        return EMOTION_ALIASES[label]
        
    return "neutral"
