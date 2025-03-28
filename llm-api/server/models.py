from transformers import pipeline

generator = pipeline(
    'text-generation',
    model="distilgpt2",  # Use a smaller model
    do_sample=True,
    max_length=150
)

