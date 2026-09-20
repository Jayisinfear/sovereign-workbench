from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
import os
import json
import shutil
from datetime import datetime, timezone
from fastapi.middleware.cors import CORSMiddleware

from backend.agent.loop import execute_agent_task, AVAILABLE_TOOLS, MODEL_NAME
from backend.ingestion.rag import ingest_document
from backend.audit import log_audit, AUDIT_LOG_PATH

app = FastAPI(title="Sovereign AI Workbench API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCUMENTS_DIR = os.path.realpath(os.path.join(BASE_DIR, "storage", "documents"))
OUTPUTS_DIR = os.path.realpath(os.path.join(BASE_DIR, "storage", "outputs"))

os.makedirs(DOCUMENTS_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)


class ChatRequest(BaseModel):
    prompt: str
    history: Optional[List[Dict[str, str]]] = None

# Global stats dictionary
token_stats = {
    "total_tokens": 0,
    "total_requests": 0
}


# ---------------------------------------------------------------------------
# POST /api/chat — SSE streaming
# ---------------------------------------------------------------------------
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Streams agent progress as Server-Sent Events.
    Each event is: data: {json}\n\n
    Final sentinel is: data: [DONE]\n\n
    """
    print(f"\n[API RECV] Request: {request.prompt}")
    
    log_audit("chat_request", {"prompt": request.prompt})
    token_stats["total_requests"] += 1

    def event_stream():
        try:
            for event in execute_agent_task(request.prompt, history=request.history):
                if event.get("type") == "token_usage":
                    token_stats["total_tokens"] += event.get("total_tokens", 0)
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# POST /api/upload — file upload + auto RAG ingestion
# ---------------------------------------------------------------------------
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Save an uploaded file and auto-ingest into the RAG knowledge base."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    safe_name = os.path.basename(file.filename)
    dest_path = os.path.join(DOCUMENTS_DIR, safe_name)
    log_audit("file_upload", {"filename": safe_name})

    try:
        with open(dest_path, "wb") as f:
            content = await file.read()
            f.write(content)
        print(f"[UPLOAD] Saved: {dest_path} ({len(content)} bytes)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save failed: {str(e)}")

    # Auto-ingest for RAG
    ingest_msg = ""
    try:
        ingest_msg = ingest_document(safe_name, safe_name)
    except Exception as e:
        ingest_msg = f"Ingestion warning: {str(e)}"
        print(f"[UPLOAD] RAG ingestion failed (non-fatal): {e}")

    return {
        "filename": safe_name,
        "status": "ingested",
        "size": len(content),
        "message": ingest_msg
    }


# ---------------------------------------------------------------------------
# GET /api/documents — list uploaded docs
# ---------------------------------------------------------------------------
@app.get("/api/documents")
async def list_documents():
    """List all files in the documents folder."""
    docs = []
    for name in os.listdir(DOCUMENTS_DIR):
        if name.startswith("."):
            continue
        fpath = os.path.join(DOCUMENTS_DIR, name)
        if os.path.isfile(fpath):
            stat = os.stat(fpath)
            docs.append({
                "name": name,
                "size": stat.st_size,
                "uploaded_at": datetime.fromtimestamp(
                    stat.st_mtime, tz=timezone.utc
                ).isoformat()
            })
    return {"documents": docs}


# ---------------------------------------------------------------------------
# GET /api/outputs — list generated deliverables
# ---------------------------------------------------------------------------
@app.get("/api/outputs")
async def list_outputs():
    """List all generated files in the outputs folder."""
    outputs = []
    for name in os.listdir(OUTPUTS_DIR):
        if name.startswith("."):
            continue
        fpath = os.path.join(OUTPUTS_DIR, name)
        if os.path.isfile(fpath):
            stat = os.stat(fpath)
            outputs.append({
                "name": name,
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(
                    stat.st_mtime, tz=timezone.utc
                ).isoformat()
            })
    return {"outputs": outputs}


# ---------------------------------------------------------------------------
# GET /api/outputs/{filename} — download a deliverable
# ---------------------------------------------------------------------------
@app.get("/api/outputs/{filename}")
async def download_output(filename: str):
    """Download a generated deliverable file."""
    safe_name = os.path.basename(filename)
    file_path = os.path.join(OUTPUTS_DIR, safe_name)
    log_audit("file_download", {"filename": safe_name})

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found.")

    return FileResponse(
        path=file_path,
        filename=safe_name,
        media_type="application/octet-stream"
    )


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------
@app.get("/health")
async def health_check():
    """Health check with system info."""
    return {
        "status": "Air-gapped server online",
        "model": MODEL_NAME,
        "tools": list(AVAILABLE_TOOLS.keys())
    }

# ---------------------------------------------------------------------------
# GET /api/stats — return token stats
# ---------------------------------------------------------------------------
@app.get("/api/stats")
async def get_stats():
    """Returns total tokens, requests, and estimated cloud cost ($5 per 1M)."""
    cost = (token_stats["total_tokens"] / 1_000_000) * 5.0
    return {
        "total_tokens": token_stats["total_tokens"],
        "total_requests": token_stats["total_requests"],
        "estimated_cloud_cost_usd": cost
    }

# ---------------------------------------------------------------------------
# GET /api/audit — return audit log
# ---------------------------------------------------------------------------
@app.get("/api/audit")
async def get_audit():
    """Returns the last 100 audit log entries."""
    entries = []
    if os.path.exists(AUDIT_LOG_PATH):
        with open(AUDIT_LOG_PATH, "r") as f:
            lines = f.readlines()
            for line in lines[-100:]:
                try:
                    entries.append(json.loads(line.strip()))
                except:
                    pass
    return {"audit_log": entries}


if __name__ == "__main__":
    print("[SYSTEM] Starting Sovereign AI Workbench Backend on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)