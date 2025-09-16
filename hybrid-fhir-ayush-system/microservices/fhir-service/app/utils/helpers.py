# helpers.py: Common utility functions.
# In MVP, minimal; e.g., logging or formatting.
# Expand for date utils, error wrappers, etc.

def log_message(message: str):
    # Simple print-based logger for MVP.
    # In production, use logging module.
    print(f"[FHIR Service] {message}")