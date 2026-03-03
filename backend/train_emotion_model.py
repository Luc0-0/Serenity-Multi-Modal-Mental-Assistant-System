"""
Train custom emotion classifier on your data.
"""
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer
)
from datasets import load_dataset
import numpy as np
from sklearn.metrics import accuracy_score, f1_score

# Load your data
dataset = load_dataset('csv', data_files={
    'train': 'emotion_training_data.csv',
    'test': 'emotion_test_data.csv'  # 20% of your data
})

# Emotion labels
emotion_labels = ["sadness", "joy", "anger", "fear", "surprise", "neutral"]
label2id = {label: i for i, label in enumerate(emotion_labels)}
id2label = {i: label for i, label in enumerate(emotion_labels)}

# Load tokenizer and model
model_name = "distilbert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=len(emotion_labels),
    id2label=id2label,
    label2id=label2id
)

# Tokenize function
def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True,
        max_length=128
    )

# Tokenize datasets
tokenized_datasets = dataset.map(tokenize_function, batched=True)

# Convert labels to IDs
def convert_labels(examples):
    examples["label"] = [label2id[label] for label in examples["label"]]
    return examples

tokenized_datasets = tokenized_datasets.map(convert_labels, batched=True)

# Metrics
def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=1)
    return {
        "accuracy": accuracy_score(labels, predictions),
        "f1": f1_score(labels, predictions, average="weighted")
    }

# Training arguments
training_args = TrainingArguments(
    output_dir="./emotion-model-finetuned",
    evaluation_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=3,
    weight_decay=0.01,
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    push_to_hub=False,
)

# Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["test"],
    compute_metrics=compute_metrics,
)

# Train
print("Starting training...")
trainer.train()

# Save
model.save_pretrained("./emotion-model-finetuned")
tokenizer.save_pretrained("./emotion-model-finetuned")
print("✓ Model saved to ./emotion-model-finetuned")

# Test
results = trainer.evaluate()
print(f"\nTest Results:")
print(f"  Accuracy: {results['eval_accuracy']:.2%}")
print(f"  F1 Score: {results['eval_f1']:.2%}")
