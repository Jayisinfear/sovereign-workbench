import fitz  # PyMuPDF
import os
import ollama
import base64

# The ONLY directory the agent is ever allowed to read documents from.
# Anything that resolves outside this folder is refused, no matter what
# the LLM's tool call asks for.
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCUMENTS_DIR = os.path.realpath(os.path.join(_PROJECT_ROOT, "storage", "documents"))

# Same explicit client pattern as agent/loop.py — don't rely on the
# library picking up OLLAMA_HOST on its own.
client = ollama.Client(host=os.environ.get("OLLAMA_HOST", "http://localhost:11434"))
MODEL_NAME = os.environ.get("MODEL_NAME", "qwen3.5:9b")


def _resolve_safe_path(file_path: str):
    """
    Resolves file_path against DOCUMENTS_DIR and refuses anything that
    escapes it (absolute paths, '..' traversal, symlink tricks).
    Returns the safe absolute path, or None if the request is out of bounds.
    """
    # Strip any leading slash so os.path.join can't be tricked into treating
    # file_path as absolute and silently discarding DOCUMENTS_DIR.
    cleaned = file_path.lstrip("/\\")
    candidate = os.path.realpath(os.path.join(DOCUMENTS_DIR, cleaned))

    if os.path.commonpath([candidate, DOCUMENTS_DIR]) != DOCUMENTS_DIR:
        return None

    return candidate


def analyze_document_vision(file_path: str, query: str) -> str:
    """
    Parses a scanned PDF or image from the sandboxed documents folder,
    rasterizes it, and sends it to the local vision model.
    """
    print(f"\n[INGESTION] Requested document: {file_path}")

    safe_path = _resolve_safe_path(file_path)
    if safe_path is None:
        print(f"[INGESTION BLOCKED] Path escapes documents directory: {file_path}")
        return (
            "Error: that file path is outside the permitted documents "
            "directory and was refused."
        )

    if not os.path.exists(safe_path):
        return f"Error: Document not found: {file_path}"

    try:
        # 1. Rasterize the document (Convert PDF page 1 to PNG bytes)
        doc = fitz.open(safe_path)
        page = doc.load_page(0)
        # 150 DPI balances reading quality and GPU VRAM limits
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")

        # 2. Encode to base64 for the Ollama API
        img_b64 = base64.b64encode(img_bytes).decode("utf-8")

        print(f"[VISION] Passing image to {MODEL_NAME} for analysis...")

        # 3. Call the multimodal model (handles vision + tools + reasoning)
        response = client.chat(
            model=MODEL_NAME,
            messages=[{
                "role": "user",
                "content": query,
                "images": [img_b64],
            }],
        )

        result = response["message"]["content"]
        print("[VISION SUCCESS] Extracted data successfully.")
        return f"Document Analysis Result:\n{result}"

    except Exception as e:
        return f"Vision processing failed: {str(e)}"
