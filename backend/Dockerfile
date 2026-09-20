FROM python:3.11-slim

# firejail provides the real sandboxing boundary used by agent/sandbox.py
RUN apt-get update && \
    apt-get install -y --no-install-recommends firejail && \
    rm -rf /var/lib/apt/lists/*

# Copied so the package resolves as "backend.xxx" to match the existing
# absolute imports in main.py / loop.py — see PYTHONPATH below.
WORKDIR /app/backend
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

WORKDIR /app
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
