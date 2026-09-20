import os
import json
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIT_LOG_PATH = os.path.realpath(os.path.join(BASE_DIR, "storage", "audit_log.jsonl"))

os.makedirs(os.path.dirname(AUDIT_LOG_PATH), exist_ok=True)

def log_audit(action: str, details: dict, user: str = "engineer"):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user": user,
        "action": action,
        "details": details
    }
    try:
        with open(AUDIT_LOG_PATH, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        print(f"[AUDIT ERROR] Could not write to audit log: {e}")
