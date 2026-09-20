import os
import fitz  # PyMuPDF
import ollama
import chromadb

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_DIR = os.path.realpath(os.path.join(_PROJECT_ROOT, "storage", "chroma_data"))
DOCUMENTS_DIR = os.path.realpath(os.path.join(_PROJECT_ROOT, "storage", "documents"))

client = ollama.Client(host=os.environ.get("OLLAMA_HOST", "http://localhost:11434"))
MODEL_NAME = os.environ.get("MODEL_NAME", "qwen3.5:9b")

os.makedirs(CHROMA_DIR, exist_ok=True)
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = chroma_client.get_or_create_collection(name="knowledge_base")


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    """Split text into overlapping chunks for embedding."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return [c.strip() for c in chunks if c.strip()]


def _get_embedding(text: str) -> list:
    """Get embedding vector from the local Ollama model."""
    response = client.embeddings(model=MODEL_NAME, prompt=text)
    return response["embedding"]


def _resolve_safe_path(file_path: str):
    """Refuse anything outside DOCUMENTS_DIR."""
    cleaned = file_path.lstrip("/\\")
    candidate = os.path.realpath(os.path.join(DOCUMENTS_DIR, cleaned))
    if os.path.commonpath([candidate, DOCUMENTS_DIR]) != DOCUMENTS_DIR:
        return None
    return candidate


def ingest_document(file_path: str, file_name: str) -> str:
    """
    Read a PDF or text file from the documents folder, chunk it,
    embed each chunk via Ollama, and store in ChromaDB.
    """
    print(f"\n[RAG] Ingesting document: {file_name}")

    safe_path = _resolve_safe_path(file_path)
    if safe_path is None:
        return "Error: file path is outside the permitted documents directory."

    if not os.path.exists(safe_path):
        return f"Error: Document not found: {file_path}"

    # Check if already ingested (by doc_id prefix)
    doc_prefix = f"doc_{file_name}_"
    existing = collection.get(where={"source": file_name})
    if existing and existing["ids"]:
        print(f"[RAG] Document '{file_name}' already ingested ({len(existing['ids'])} chunks). Skipping.")
        return f"Document '{file_name}' is already in the knowledge base ({len(existing['ids'])} chunks)."

    # Extract text
    text = ""
    lower = file_name.lower()
    try:
        if lower.endswith(".pdf"):
            doc = fitz.open(safe_path)
            for page in doc:
                text += page.get_text() + "\n"
            doc.close()
        else:
            with open(safe_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
    except Exception as e:
        return f"Error reading document: {str(e)}"

    if not text.strip():
        return f"Error: No readable text found in '{file_name}'."

    # Chunk
    chunks = _chunk_text(text)
    if not chunks:
        return f"Error: Document '{file_name}' produced no text chunks."

    print(f"[RAG] Chunked into {len(chunks)} segments. Embedding...")

    # Embed and store
    ids = []
    embeddings = []
    documents = []
    metadatas = []

    for i, chunk in enumerate(chunks):
        try:
            emb = _get_embedding(chunk)
            ids.append(f"{doc_prefix}{i}")
            embeddings.append(emb)
            documents.append(chunk)
            metadatas.append({"source": file_name, "chunk_index": i})
        except Exception as e:
            print(f"[RAG WARN] Failed to embed chunk {i}: {e}")
            continue

    if not ids:
        return "Error: Failed to embed any chunks from the document."

    collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

    msg = f"Success: Ingested '{file_name}' into knowledge base ({len(ids)} chunks indexed)."
    print(f"[RAG] {msg}")
    return msg


def search_knowledge_base(query: str, top_k: int = 3) -> str:
    """
    Search the local ChromaDB knowledge base for chunks relevant to the query.
    """
    print(f"\n[RAG SEARCH] Query: {query}")

    if collection.count() == 0:
        return ("The knowledge base is currently empty. Upload documents via the "
                "workbench UI or ask the user to provide documents first.")

    try:
        query_embedding = _get_embedding(query)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, collection.count()),
        )

        if not results["documents"] or not results["documents"][0]:
            return "No relevant results found in the knowledge base."

        formatted = "Knowledge Base Search Results:\n"
        formatted += "=" * 50 + "\n"
        for i, (doc, meta) in enumerate(
            zip(results["documents"][0], results["metadatas"][0])
        ):
            source = meta.get("source", "unknown")
            formatted += f"\n--- Result {i + 1} (Source: {source}) ---\n"
            formatted += doc.strip() + "\n"

        print(f"[RAG SEARCH] Returned {len(results['documents'][0])} results.")
        return formatted

    except Exception as e:
        return f"Knowledge base search failed: {str(e)}"
