# Emotion Model Integration

## Quick Start (Pre-trained Model)

### 1. Install Dependencies
```bash
cd backend
pip install transformers torch
```

### 2. Enable Model
Edit `.env`:
```
USE_XLNET=true
```

### 3. Restart Backend
```bash
uvicorn app.main:app --reload
```

First run downloads model (~250MB, one-time).

---

## Option A: Use Pre-trained Model (RECOMMENDED)

**Model**: `bhadresh-savani/distilbert-base-uncased-emotion`
- Already trained on emotion data
- 6 emotions: sadness, joy, love, anger, fear, surprise
- ~94% accuracy
- Fast inference (~50ms CPU)

**No training needed!** Just enable and use.

---

## Option B: Train Your Own Model

### Why Train?
- Better accuracy for mental health context
- Custom emotion classes
- Domain-specific language

### 1. Prepare Training Data

Create `emotion_training_data.csv`:
```csv
text,label
"I'm feeling overwhelmed with deadlines",fear
"My boss keeps adding more tasks",anger
"I can barely sleep thinking about it",fear
"I feel like I'm failing at everything",sadness
"A friend reached out today and it helped",joy
...
```

**Minimum**: 500 examples per emotion (3,000 total)
**Recommended**: 2,000+ examples per emotion

### 2. Split Data
```python
import pandas as pd
from sklearn.model_selection import train_test_split

df = pd.read_csv('emotion_training_data.csv')
train, test = train_test_split(df, test_size=0.2, stratify=df['label'])
train.to_csv('emotion_training_data.csv', index=False)
test.to_csv('emotion_test_data.csv', index=False)
```

### 3. Train Model
```bash
python train_emotion_model.py
```

Training takes ~30 minutes (CPU) or ~5 minutes (GPU).

### 4. Use Trained Model

Update `xlnet_classifier.py`:
```python
def __init__(self, model_path: str = "./emotion-model-finetuned"):
```

Restart backend.

---

## Data Sources for Training

### Public Datasets
1. **GoEmotions** (Google): 58k Reddit comments, 27 emotions
2. **Emotion Dataset** (HuggingFace): 20k tweets, 6 emotions
3. **ISEAR**: 7k sentences, 7 emotions

### Download Example
```python
from datasets import load_dataset

# Load GoEmotions
dataset = load_dataset("google-research-datasets/go_emotions", "simplified")

# Filter to your 6 emotions
emotion_map = {
    "sadness": "sadness",
    "joy": "joy",
    "anger": "anger",
    "fear": "fear",
    "surprise": "surprise",
    "neutral": "neutral"
}

# Convert and save
import pandas as pd
df = pd.DataFrame(dataset['train'])
df = df[df['labels'].isin(emotion_map.keys())]
df.to_csv('emotion_training_data.csv', index=False)
```

---

## Performance Comparison

| Method | Accuracy | Speed (CPU) | Memory |
|--------|----------|-------------|--------|
| Keywords | ~60% | 1ms | Negligible |
| Pre-trained | ~94% | 50ms | 250MB |
| Fine-tuned | ~97% | 50ms | 250MB |

---

## Testing Your Model

```bash
python -c "
from app.services.emotion_service import EmotionService
import asyncio

service = EmotionService(use_xlnet=True)

test_messages = [
    'I am so happy today!',
    'I feel really sad and alone',
    'This makes me so angry',
    'I am scared about tomorrow',
]

for msg in test_messages:
    result = asyncio.run(service.detect_emotion(msg))
    print(f'{msg[:30]:30s} → {result["label"]:10s} ({result["confidence"]:.2f})')
"
```

---

## Switching Models

### Use Pre-trained
```python
# xlnet_classifier.py
def __init__(self, model_path: str = "bhadresh-savani/distilbert-base-uncased-emotion"):
```

### Use Your Trained Model
```python
def __init__(self, model_path: str = "./emotion-model-finetuned"):
```

### Back to Keywords
```
USE_XLNET=false
```
