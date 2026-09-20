import os
import re

MODEL_NAME = os.environ.get("MODEL_NAME", "qwen3.5:9b")

# Keyword-based routing — instant, no LLM call needed.
# Each pattern list maps to a task_type for logging/UI display.
_VISION_PATTERNS = re.compile(
    r'\b(scan|scanned|image|photo|photograph|picture|drawing|diagram|p&id|pid|'
    r'visual|inspect|handwrit|ocr|png|jpg|jpeg|blueprint|sketch)\b',
    re.IGNORECASE
)
_CODING_PATTERNS = re.compile(
    r'\b(calculat|compute|formula|equation|math|code|script|python|'
    r'spreadsheet|excel|xlsx|engineering calc|pressure drop|flow rate|'
    r'heat transfer|bernoulli|stress|strain|solve)\b',
    re.IGNORECASE
)
_RAG_PATTERNS = re.compile(
    r'\b(sop|manual|procedure|knowledge base|past report|internal doc|'
    r'correspondence|guideline|standard|policy|regulation|search.*document|'
    r'find.*report|look.*up|what does our)\b',
    re.IGNORECASE
)


def get_routing_decision(user_prompt: str) -> dict:
    """
    Fast keyword-based task classifier — runs instantly, no LLM call.
    Since only qwen3.5:9b is available, the model is always the same.
    The task_type is used for logging and UI display.
    """
    prompt = user_prompt.strip()

    if _VISION_PATTERNS.search(prompt):
        task_type = "vision"
    elif _CODING_PATTERNS.search(prompt):
        task_type = "coding"
    elif _RAG_PATTERNS.search(prompt):
        task_type = "rag"
    else:
        task_type = "text"

    print(f"[ROUTER] Classified as '{task_type}' → routing to {MODEL_NAME}")
    return {"model": MODEL_NAME, "task_type": task_type}