<div align="center">

# 🛡️ Sovereign AI Workbench

### A fully air-gapped, self-hosted AI assistant for industrial engineers

[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-black?logo=ollama)](https://ollama.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**No cloud. No API keys. No data leaves your machine.**

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Usage Guide](#-usage-guide) • [Project Structure](#-project-structure) • [Security](#-security) • [Troubleshooting](#-troubleshooting)

---

</div>

## 📖 What Is This?

Sovereign AI Workbench is a **complete AI-powered workspace** designed for environments where data confidentiality is critical — defense, energy, manufacturing, government, or any organization that cannot send data to cloud AI services.

It runs **entirely on your local machine** using [Ollama](https://ollama.com) for LLM inference, with zero internet dependency after setup.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 💬 **AI Chat Interface** | Multi-turn conversational AI with streaming responses and thinking visualization |
| 📄 **Document Analysis** | Upload PDFs, images, and scanned documents for automated extraction and analysis |
| 📊 **Excel Report Generation** | AI generates styled `.xlsx` spreadsheets with headers, formatted rows, and auto-fit columns |
| 📝 **Word Document Drafting** | Auto-generates `.docx` approval notes and reports from extracted findings |
| 🔢 **Engineering Calculations** | Executes Python math/engineering code in a secure firejail sandbox (numpy, sympy, math) |
| 🔍 **RAG Knowledge Base** | Upload documents to build a searchable knowledge base with vector embeddings via ChromaDB |
| 📎 **File Attachments** | Attach files directly in the chat — auto-uploads and ingests into the knowledge base |
| 📋 **Audit Trail** | Every action (chats, uploads, downloads, tool executions) is logged to an append-only JSONL audit log |
| 💰 **Cost Savings Tracker** | Tracks token usage and shows estimated cloud cost savings in real-time |
| 🔒 **Air-Gapped Networking** | Docker network isolation ensures the LLM container has zero internet access |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                          │
│  ┌──────────────┐    airgapped     ┌──────────────────┐  │
│  │   Ollama      │◄──(internal)───►│   FastAPI Backend │  │
│  │  Local LLM    │    network      │                    │  │
│  │  (GPU)        │                 │  • Agent Loop      │  │
│  └──────────────┘                 │  • Tool Executor   │  │
│                                    │  • RAG Engine      │  │
│                                    │  • Firejail Sandbox│  │
│                                    └────────┬───────────┘  │
│                                    hostaccess│network       │
│                                    ┌────────┴───────────┐  │
│                                    │  React Frontend     │  │
│                                    │  (nginx :5173)      │  │
│                                    └────────────────────┘  │
└─────────────────────────────────────────────────────────┘
          ▲                                    ▲
          │ :8000 (API)                        │ :5173 (UI)
          └────────────────┬───────────────────┘
                     Your Browser
```

**Key design decisions:**
- The **Ollama container** sits on an `internal` Docker network with no internet access
- The **backend** bridges both networks — it talks to Ollama internally and exposes the API externally
- The **frontend** is a static React build served via nginx
- All LLM-generated code runs inside **firejail** with network, filesystem, memory, and CPU limits

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| [Docker Desktop](https://docker.com/products/docker-desktop) | 20.10+ | Runs all services |
| [Docker Compose](https://docs.docker.com/compose/) | v2+ | Orchestrates containers |
| [Ollama](https://ollama.com/download) | Latest | Local LLM inference |
| NVIDIA GPU + Drivers | CUDA 11.7+ | GPU-accelerated inference (recommended) |

> **Note:** You can run without a GPU, but responses will be significantly slower.

### Step 1: Clone the Repository

```bash
git clone https://github.com/<your-username>/sovereign-workbench.git
cd sovereign-workbench
```

### Step 2: Pull an Ollama Model

Before starting the app, pull the LLM model you want to use:

```bash
# Default model (recommended for most hardware)
ollama pull qwen2.5:7b

# Alternative lighter model (for lower-end GPUs, ~4GB VRAM)
ollama pull qwen2.5:3b

# Alternative heavier model (for high-end GPUs, ~16GB VRAM)
ollama pull qwen2.5:14b
```

### Step 3: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env to match your setup
```

**`.env` file contents:**
```env
# The model you pulled in Step 2
MODEL_NAME=qwen2.5:7b

# Path to your Ollama data directory
# Windows: C:/Users/<YourName>/.ollama
# Linux/Mac: ~/.ollama
OLLAMA_DATA=~/.ollama
```

### Step 4: Launch

```bash
docker compose up --build
```

Wait for all three containers to start (first build takes 2-3 minutes).

### Step 5: Open the UI

Open your browser and navigate to:

```
http://localhost:5173
```

You should see the Sovereign AI Workbench interface with a teal gradient logo and a chat input.

---

## 🎯 Usage Guide

### Chat with the Agent

Type a message in the chat input and press **Enter** (or click the send button). The agent will:
1. **Route** your request (text, coding, vision, or RAG)
2. **Select tools** if needed
3. **Execute tools** and gather results
4. **Stream** the final answer back to you

You can watch the step-by-step progress in the **Activity** panel on the right.

### Upload Documents

- Click the **📎 paperclip icon** next to the chat input to attach a file
- Or use the **Documents** panel on the right side
- Supported formats: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.txt`, `.csv`, `.docx`, `.xlsx`
- Uploaded documents are **automatically ingested** into the RAG knowledge base

### Example Prompts

| Prompt | What Happens |
|--------|-------------|
| `"Calculate the pressure drop across a 100m pipe with 0.1m diameter, flow rate 0.5 m³/s"` | Runs a sandboxed Python calculation using engineering formulas |
| `"Generate an Excel report comparing steel grades SS304, SS316, and SS410"` | Creates a styled `.xlsx` spreadsheet and saves it to Outputs |
| `"Draft an approval note for the Q3 safety inspection findings"` | Generates a formatted `.docx` Word document |
| `"Search our knowledge base for welding procedures"` | Searches uploaded documents using vector similarity |
| `"Analyze the scanned drawing at inspection_report.pdf"` | Uses vision model to extract info from images/scanned PDFs |

### Download Generated Files

All generated documents (Word files, Excel reports) appear in the **Outputs** tab on the right panel. Click the download icon to save them.

### View Audit Trail

The **Audit** tab shows a chronological log of all actions — chat requests, file uploads, downloads, and tool executions.

---

## 📁 Project Structure

```
sovereign-workbench/
├── docker-compose.yml          # Orchestrates all 3 services
├── .env.example                # Environment configuration template
├── .gitignore                  # Git ignore rules
│
├── backend/                    # Python FastAPI backend
│   ├── Dockerfile              # Backend container build
│   ├── requirements.txt        # Python dependencies
│   ├── main.py                 # FastAPI app with all REST endpoints
│   ├── audit.py                # Append-only JSONL audit logger
│   │
│   ├── agent/                  # AI agent core
│   │   ├── loop.py             # Agentic tool-calling loop (max 5 iterations)
│   │   ├── router.py           # Keyword-based task classifier (no LLM call)
│   │   └── sandbox.py          # Firejail sandboxed code execution
│   │
│   ├── ingestion/              # Document processing
│   │   ├── pdf_parser.py       # PDF/image rasterization + vision model analysis
│   │   └── rag.py              # ChromaDB vector store + embedding + search
│   │
│   ├── tools/                  # Agent tool implementations
│   │   ├── schemas.py          # Tool JSON schemas (passed to LLM)
│   │   ├── doc_generator.py    # Word document (.docx) generator
│   │   └── excel_generator.py  # Excel spreadsheet (.xlsx) generator
│   │
│   └── storage/                # Runtime data (gitignored)
│       ├── documents/          # Uploaded files
│       ├── outputs/            # Generated deliverables
│       └── chroma_data/        # Vector database
│
└── frontend/                   # React + Vite frontend
    ├── Dockerfile              # Multi-stage build (node → nginx)
    ├── package.json            # Node dependencies
    ├── vite.config.js          # Vite bundler config
    ├── tailwind.config.js      # Tailwind CSS config
    ├── index.html              # HTML entry point
    └── src/
        ├── main.jsx            # React entry point
        ├── index.css           # Global styles + animations
        └── App.jsx             # Entire UI (chat, panels, tabs)
```

---

## 🔒 Security Features

This project takes security seriously for air-gapped deployments:

| Layer | Protection |
|-------|-----------|
| **Network Isolation** | Ollama container runs on a Docker `internal` network — zero internet access |
| **Code Sandbox** | LLM-generated Python executes inside [firejail](https://firejail.wordpress.com/) with `--net=none`, memory limits (256MB), CPU limits (5s), and seccomp filters |
| **Static Code Analysis** | Pre-execution scan blocks dangerous imports (`os`, `subprocess`, `socket`, `shutil`, `eval`, `exec`, etc.) |
| **Path Traversal Protection** | All file operations use `os.path.realpath()` + `os.path.commonpath()` to prevent directory escape attacks |
| **Filename Sanitization** | Tool outputs strip directory components and enforce correct extensions (`.docx`, `.xlsx`) |
| **Fail-Closed Design** | If firejail is not installed, code execution is **refused** entirely — no fallback to unsafe execution |
| **Audit Logging** | Every action is recorded to an append-only JSONL log file |
| **No Secrets** | No API keys, tokens, or credentials needed — everything runs locally |

---

## ⚙️ Configuration

### Changing the Model

Edit your `.env` file:

```env
MODEL_NAME=qwen2.5:14b
```

Then restart:

```bash
docker compose down
docker compose up --build
```

> **Important:** Make sure you've pulled the model first with `ollama pull <model-name>`.

### For Vision/Document Analysis

The document vision feature requires a **multimodal model**. If you want vision capabilities:

```bash
ollama pull llava:7b
# or
ollama pull qwen2-vl:7b
```

Then set `MODEL_NAME=llava:7b` in your `.env`.

> **Note:** Using a vision model means all tasks (chat, coding, RAG) also use that model. For best results, consider running separate models for text and vision tasks.

### Running Without Docker

If you prefer to run without Docker:

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Linux/Mac
# venv\Scripts\activate        # Windows
pip install -r requirements.txt
cd ..
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

> **Note:** You'll need Ollama running locally (`ollama serve`) and firejail installed for sandboxed code execution.

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Model not found" error** | Run `ollama pull qwen2.5:7b` (or your chosen model) before starting |
| **GPU not detected** | Ensure NVIDIA drivers + CUDA are installed. Check with `nvidia-smi` |
| **Frontend shows "Could not reach the Sovereign Agent"** | Backend isn't running. Check `docker compose logs backend` |
| **Sandbox refuses all code execution** | Firejail must be installed inside the backend container (the Dockerfile handles this) |
| **Vision analysis returns errors** | Your model may not support vision. Use `llava:7b` or `qwen2-vl:7b` |
| **Slow responses** | Use a smaller model (`qwen2.5:3b`) or ensure GPU acceleration is working |
| **ChromaDB errors on startup** | Delete `backend/storage/chroma_data/` and restart to rebuild the vector store |

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **LLM Runtime** | [Ollama](https://ollama.com) |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com) |
| **Frontend** | [React 18](https://react.dev) + [Vite](https://vitejs.dev) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) |
| **Vector Database** | [ChromaDB](https://www.trychroma.com) |
| **Document Generation** | [python-docx](https://python-docx.readthedocs.io) + [openpyxl](https://openpyxl.readthedocs.io) |
| **PDF Processing** | [PyMuPDF (fitz)](https://pymupdf.readthedocs.io) |
| **Code Sandbox** | [Firejail](https://firejail.wordpress.com) |
| **Markdown Rendering** | [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm) |
| **Containerization** | [Docker](https://docker.com) + Docker Compose |

---


<div align="center">

**Built for engineers who need AI without compromise.**

⭐ Star this repo if you find it useful!

</div>
