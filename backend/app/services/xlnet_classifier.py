"""  
Emotion classifier using pre-trained transformer models.
Drop-in replacement for keyword-based detection.
"""
import torch
from typing import Dict
import logging

logger = logging.getLogger(__name__)


class EmotionClassifier:
    """
    Transformer-based emotion classifier.
    
    Uses pre-trained emotion detection model from HuggingFace.
    """
    
    # Emotion label mapping - j-hartmann model outputs exact 7 emotions
    EMOTION_MAP = {
        "anger": "anger",
        "disgust": "disgust",
        "fear": "fear",
        "joy": "joy",
        "neutral": "neutral",
        "sadness": "sadness",
        "surprise": "surprise"
    }
    
    def __init__(self, model_path: str = "j-hartmann/emotion-english-distilroberta-base"):
        """
        Initialize emotion classifier.
        
        Args:
            model_path: HuggingFace model name or local path
                       Default: j-hartmann/emotion-english-distilroberta-base
                       - 7 emotions (anger, disgust, fear, joy, neutral, sadness, surprise)
                       - 66% accuracy on diverse emotion datasets
                       - Trained on 416K examples
        """
        logger.info(f"Loading emotion model: {model_path}")
        
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
            self.model.eval()
            
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model.to(self.device)
            
            logger.info(f"✓ Emotion model loaded on {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise
    
    def predict(self, text: str) -> Dict[str, any]:
        """
        Predict emotion from text.
        
        Args:
            text: Input message
        
        Returns:
            {
                "label": str,           # emotion name
                "confidence": float     # 0-1 confidence score
            }
        """
        try:
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = torch.softmax(outputs.logits, dim=-1)
                confidence, predicted_idx = torch.max(probs, dim=-1)
                
                # Get emotion label from model config
                emotion_label = self.model.config.id2label[predicted_idx.item()]
                
                # Map to our emotion set
                emotion_label = self.EMOTION_MAP.get(emotion_label, "neutral")
                confidence_score = confidence.item()
            
            logger.info(f"Emotion prediction: {emotion_label} ({confidence_score:.2f})")
            
            return {
                "label": emotion_label,
                "confidence": confidence_score
            }
        
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            return {
                "label": "neutral",
                "confidence": 0.5
            }


# Singleton instance (lazy loading)
_emotion_classifier = None


def get_emotion_classifier() -> EmotionClassifier:
    """Get or create emotion classifier instance."""
    global _emotion_classifier
    if _emotion_classifier is None:
        _emotion_classifier = EmotionClassifier()
    return _emotion_classifier
