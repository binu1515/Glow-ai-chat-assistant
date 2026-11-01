# Full-Stack AI Chatbot with Model Context Protocol (MCP)

A production-grade, full-stack AI chatbot application integrating an **official Model Context Protocol (MCP) server**, configurable LLM providers (Google Gemini, OpenAI, Anthropic), multi-turn conversation memory with sliding window context management, **Redis-based TTL caching**, real-time Server-Sent Events (SSE) streaming, and comprehensive **LLM token usage monitoring and cost analytics**.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Implemented Features](#key-implemented-features)
3. [System Architecture Diagram](#system-architecture-diagram)
4. [Technology Stack & Dependencies](#technology-stack--dependencies)
5. [MCP Server & Tool Definitions](#mcp-server--tool-definitions)
6. [Chat Memory Implementation & Management](#chat-memory-implementation--management)
7. [Redis Caching Strategy & Performance Benefits](#redis-caching-strategy--performance-benefits)
8. [Token Usage & Cost Monitoring](#token-usage--cost-monitoring)
9. [API Security & Credential Protection](#api-security--credential-protection)
10. [API Endpoint Documentation](#api-endpoint-documentation)
11. [Environment Variable Configuration](#environment-variable-configuration)
12. [Docker Deployment & Getting Started](#docker-deployment--getting-started)
13. [Local Development Setup](#local-development-setup)
14. [Running Tests](#running-tests)
15. [Known Limitations & Future Improvements](#known-limitations--future-improvements)

---

## 1. Project Overview

Modern conversational AI systems require more than simple prompt-response interactions: they must reliably ground themselves with external tools, maintain conversation context across turns, manage API token expenditures, and optimize response latency using caching.

This application delivers an end-to-end architecture demonstrating:
- **Official Model Context Protocol (MCP) 2.x SDK integration**: Exposing a separate microservice with calculator, live meteorological forecasting, and document retrieval tools.
- **Provider-Agnostic LLM Engine**: Seamlessly switch between Google Gemini, OpenAI, and Anthropic models on the fly without restarting services.
- **Real-Time Streaming**: Server-Sent Events (SSE) streaming tokens to the client alongside live tool invocation and execution cards.
- **Resilient Multi-Layer Caching**: Redis-backed caching with Time-To-Live (TTL) for external tool queries, with transparent in-memory fallback and on-demand cache invalidation.
- **Token Analytics**: Live collection of prompt and completion token counts directly from actual LLM response metadata with accurate per-model USD cost calculation.
- **Docker Compose One-Command Launch**: Single command orchestrating React, FastAPI, MCP Server, Redis, and PostgreSQL.

---

## 2. Key Implemented Features

### A. AI Chat Interface
- **Responsive React SPA**: Built with modern React, Tailwind styling, and Lucide icons.
- **Multi-Turn Chat History**: Preserves conversation continuity across turns with session management (create, rename, delete).
- **Real-Time SSE Streaming**: Token-by-token output rendering with an animated cursor.
- **Tool Invocation Cards**: Visual cards showing tool name, arguments, execution status, and **"⚡ Redis Hit" vs "💾 Fresh Fetch"** badges.
- **Stop Generation Control**: Cancel in-flight streaming requests at any time.

### B. Configurable AI Model Settings
- **Dynamic Provider & Model Selection**: Switch between Gemini (1.5 Flash, 1.5 Pro, 2.0 Flash), OpenAI (GPT-4o, GPT-4o Mini), and Anthropic (Claude 3.5 Sonnet, Haiku).
- **Hyperparameter Customization**: Real-time sliders for Temperature ($0.0 - 2.0$), Max Output Tokens ($128 - 8192$), and Sliding Memory Window ($2 - 40$ messages).
- **Secure Key Vault**: API keys are encrypted at rest using AES-256 (Fernet) and strictly masked in UI responses (`sk-...cdef`). Keys are never exposed in logs or version-controlled files.
- **Zero-Restart Updates**: Model switches and parameters apply immediately to subsequent turns.

### C. MCP Server Microservice
- Built using the **Official MCP Python SDK** (`mcp` package) running as an independent service on port 8001.
- Implements 3 functional tools:
  1. **Safe Calculator**: Evaluates arithmetic, trigonometry, square root, powers, logarithms, and constants (`pi`, `e`) using AST traversal (no unsafe `eval()`).
  2. **Live Weather Service**: Fetches real-time temperature, conditions, humidity, and wind speed from Open-Meteo's open public API.
  3. **Document Search**: Splits uploaded text/markdown documents into chunks and computes similarity scores to answer user queries with cited source passages.
- Automatic tool binding and invocation via LangChain tool-calling agents.

### D. Chat Memory Management
- Multi-turn conversation persistence in PostgreSQL / SQLite.
- Sliding window context windowing: loads recent message pairs while maintaining token budget.
- Preserves both user turns, tool invocations, tool outputs, and assistant syntheses.

### E. Redis Caching Layer
- Configurable TTL: Weather queries (600s), Document searches (300s).
- Live metrics: Cache Hits, Cache Misses, Hit Ratio %, and Active Key counts.
- Granular invalidation controls: Purge entire cache (`*`), weather only (`cache:weather:*`), or document searches (`cache:doc_search:*`).
- Automatic document cache invalidation on upload/deletion of new documents.

### F. LLM Token Usage Monitoring & Cost Analytics
- Metric cards: Prompt Tokens, Completion Tokens, Total Tokens, and Estimated USD Cost.
- Breakdown tables by LLM Model and by Conversation Session.
- Invocations history log showing exact token consumption per request.
- Metadata extracted directly from actual provider response objects (`usage_metadata`).

---

## 3. System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client ["Frontend (React.js + Tailwind)"]
        UI["Chat Interface & SSE Consumer"]
        SettingsUI["Model Settings & Key Vault"]
        DashboardUI["Token Analytics Dashboard"]
        CacheUI["Redis Cache Monitor"]
        DocUI["Document Knowledge Base"]
    end

    subgraph Backend ["FastAPI Backend Application"]
        Router["API Gateway / Routers"]
        Agent["LangChain / LangGraph Agent Loop"]
        MemoryMgr["Conversation Memory & Windowing"]
        Tracker["Token Usage Tracker & Pricing Engine"]
        Vault["Secret Vault (AES-256 Fernet)"]
        MCPClient["MCP Client Manager"]
    end

    subgraph MCP ["MCP Server Microservice"]
        MCPServer["MCP Starlette / SSE Server (:8001)"]
        CalcTool["Safe Math Evaluator (AST)"]
        WeatherTool["Live Weather Tool (Open-Meteo)"]
        DocTool["Document Search Tool"]
    end

    subgraph Storage ["Infrastructure Services"]
        PG[("PostgreSQL Database (:5432)")]
        RedisStore[("Redis Cache & Metrics (:6379)")]
        DocsDir["Shared Volume (/app/data/documents)"]
    end

    UI <-->|SSE Stream & REST| Router
    Router --> Agent
    Agent <--> MemoryMgr
    MemoryMgr <--> PG
    Agent --> Tracker
    Tracker --> PG
    Agent <--> MCPClient
    Vault <--> PG

    MCPClient <-->|Check & Store Cache (TTL)| RedisStore
    MCPClient <-->|SSE /messages| MCPServer
    MCPServer --> CalcTool
    MCPServer --> WeatherTool
    MCPServer --> DocTool
    DocTool <--> DocsDir
    DocUI -->|Upload Files| Router --> DocsDir
```

---

## 4. Technology Stack & Dependencies

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React.js | 18.x / 19.x | Component-based interactive UI |
| **Build Tool** | Vite | 5.x | Ultra-fast frontend bundling and HMR |
| **Icons & Styles** | Tailwind CSS & Lucide Icons | Latest | Responsive dark-mode styling |
| **Backend Framework** | FastAPI | 0.115+ | High-performance asynchronous API |
| **ASGI Server** | Uvicorn | 0.30+ | ASGI web server |
| **AI Orchestration** | LangChain & LangGraph | 0.3+ | Tool calling agent loop and memory |
| **MCP SDK** | Official MCP Python SDK | 1.30+ / 2.3+ | Model Context Protocol server and client |
| **Relational Database** | PostgreSQL / SQLite | 16-alpine | Persistent chat sessions, logs, and docs |
| **ORM** | SQLAlchemy (Async) + aiosqlite / asyncpg | 2.0+ | Non-blocking async database layer |
| **Caching Layer** | Redis + redis-py (asyncio) | 7-alpine | In-memory key-value cache with TTL |
| **HTTP Clients** | HTTPX | 0.27+ | Asynchronous REST and SSE client |
| **Cryptography** | Cryptography (Fernet) | 43.0+ | AES-256 encryption for API keys |
| **Deployment** | Docker & Docker Compose | 25.0+ | Container orchestration |

---

## 5. MCP Server & Tool Definitions

The Model Context Protocol (MCP) server runs as an independent microservice (`mcp_server/server.py`) exposing tools over **Server-Sent Events (SSE)** at `/sse` and HTTP.

### Available Tools:

#### 1. `calculate(expression: str) -> str`
- **Purpose**: Safely evaluates mathematical expressions.
- **Safety**: Uses Python's `ast` (Abstract Syntax Tree) module to restrict operations to permitted mathematical nodes. Does not execute raw code or access file systems.
- **Supported Operators**: `+`, `-`, `*`, `/`, `//`, `%`, `**`, `^`.
- **Supported Functions**: `sqrt`, `sin`, `cos`, `tan`, `log`, `log10`, `abs`, `round`, `floor`, `ceil`, `exp`.
- **Supported Constants**: `pi`, `e`, `tau`.
- **Example Call**:
  ```json
  { "expression": "sqrt(256) * (18 - 4) / 7" }
  // Returns: "32.0"
  ```

#### 2. `get_weather(location: str) -> str`
- **Purpose**: Retrieves live weather conditions for any city worldwide.
- **Provider**: Open-Meteo public API (geocoding + hourly/current meteorological forecast).
- **Metrics Returned**: Temperature in Celsius & Fahrenheit, feels-like temperature, humidity percentage, wind speed (km/h), precipitation, and WMO weather condition description.
- **Caching**: Cached in Redis under `cache:weather:<city>` with a **10-minute TTL (600s)**.

#### 3. `search_document(query: str, doc_name: Optional[str]) -> str`
- **Purpose**: Searches uploaded text, markdown, or JSON documents.
- **Algorithm**: Chunks documents into overlapping windows, calculates term coverage and frequency scores, and ranks matching excerpts.
- **Caching**: Cached in Redis under `cache:doc_search:<query>:<doc>` with a **5-minute TTL (300s)**.
- **Invalidation**: Cache is automatically flushed whenever a document is uploaded or deleted.

---

## 6. Chat Memory Implementation & Management

Conversation memory is managed through a multi-tier persistence and windowing architecture:

1. **Database Persistence**:
   - Every user message, tool invocation, tool result, and final assistant synthesis is recorded in the `chat_messages` table linked to a `conversation_sessions` foreign key.
2. **Context Windowing (Sliding Window Strategy)**:
   - When generating a response, `AgentService.load_conversation_history()` retrieves previous messages up to the configurable `memory_window` limit (default: 10 messages).
   - This ensures the LLM retains multi-turn conversational context while preventing token context window overflow and reducing unnecessary prompt token costs.
3. **Tool Call History**:
   - Both `AIMessage(tool_calls=[...])` and matching `ToolMessage(content=..., tool_call_id=...)` objects are restored in sequence so the LLM understands previous tool interactions in prior turns.
4. **Session Isolation**:
   - Users can switch between independent sessions using the sidebar. Each session maintains its own isolated message history, assigned model, and token consumption logs.

---

## 7. Redis Caching Strategy & Performance Benefits

### Architecture:
- Redis stores cached tool outputs using namespaced keys:
  - `cache:weather:<location>` (TTL: 600 seconds)
  - `cache:doc_search:<query>:<doc_filter>` (TTL: 300 seconds)
- When a tool is triggered:
  1. The backend hashes/normalizes the input arguments and queries Redis.
  2. If found (**Cache Hit**): The cached output is returned immediately (sub-millisecond latency), incrementing the `hits` metric. The UI displays the `⚡ Redis Hit` badge.
  3. If missing (**Cache Miss**): The backend calls the MCP server, stores the result in Redis with `SETEX key ttl value`, and increments the `misses` metric. The UI displays the `💾 Fresh Fetch` badge.
- **Graceful In-Memory Fallback**: If the Redis server is unreachable, `CacheService` seamlessly routes queries through an in-memory dictionary cache with TTL tracking so that local tests and offline dev runs never fail.
- **Performance Benefits**:
  - **Latency**: Reduces external API latency from 300–800ms down to <2ms.
  - **Cost**: Eliminates repetitive downstream API requests and saves token re-processing.
  - **Rate Limit Protection**: Shields external APIs (such as Open-Meteo or custom vector indices) from throttling.

---

## 8. Token Usage & Cost Monitoring

### Token Collection Mechanism:
- Rather than relying solely on rough heuristics, the application captures actual token metadata directly from LLM response objects:
  - Standardized LangChain `response.usage_metadata`:
    ```python
    prompt_tokens = usage_metadata.get("input_tokens")
    completion_tokens = usage_metadata.get("output_tokens")
    ```
  - Fallback to provider-specific `response.response_metadata["token_usage"]` (OpenAI / Anthropic / Gemini).
- Token logs are recorded to the `token_usage_logs` database table per request.

### Pricing Catalog (USD per 1,000,000 tokens):
| Model | Provider | Input Cost / 1M | Output Cost / 1M | Context Window |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 1.5 Flash** | Google | \$0.075 | \$0.30 | 1,048,576 |
| **Gemini 1.5 Pro** | Google | \$1.25 | \$5.00 | 2,097,152 |
| **Gemini 2.0 Flash** | Google | \$0.10 | \$0.40 | 1,048,576 |
| **GPT-4o** | OpenAI | \$2.50 | \$10.00 | 128,000 |
| **GPT-4o Mini** | OpenAI | \$0.15 | \$0.60 | 128,000 |
| **Claude 3.5 Sonnet** | Anthropic | \$3.00 | \$15.00 | 200,000 |
| **Claude 3.5 Haiku** | Anthropic | \$0.80 | \$4.00 | 200,000 |

Cost formula:
$$\text{Cost} = \left(\frac{\text{prompt\_tokens}}{1{,}000{,}000} \times \text{input\_rate}\right) + \left(\frac{\text{completion\_tokens}}{1{,}000{,}000} \times \text{output\_rate}\right)$$

---

## 9. API Security & Credential Protection

In accordance with strict security requirements:
- **No Plaintext Keys in Responses**: API endpoints (`/api/config`) return only boolean flags (`has_api_key: true`) and masked representations (`sk-...cdef`).
- **Encryption at Rest**: User-submitted keys in the Settings modal are encrypted using **AES-256 (Fernet)** derived from the backend `SECRET_KEY` before insertion into the `config_settings` database table.
- **Log Sanitation**: Sensitive headers and credentials are excluded from application logs.
- **Version Control Exclusions**: All `.env`, `chatbot.db`, and credential files are included in `.gitignore`.

---

## 10. API Endpoint Documentation

### Chat & Streaming
- `POST /api/chat/stream`: Stream AI responses via Server-Sent Events (SSE).
  - Request body: `{ "session_id": "uuid", "message": "string", "provider": "gemini", "model": "gemini-1.5-flash", "temperature": 0.7 }`
  - Stream events: `session`, `tool_start`, `tool_end`, `token`, `usage`, `done`, `error`.

### Sessions Management
- `GET /api/sessions`: List all conversation sessions with message counts.
- `POST /api/sessions`: Create a new session.
- `GET /api/sessions/{session_id}`: Retrieve session history and messages.
- `PATCH /api/sessions/{session_id}`: Rename session or update assigned model.
- `DELETE /api/sessions/{session_id}`: Delete session and its messages.

### Configuration & Key Vault
- `GET /api/config`: Retrieve active model settings and supported provider catalogs with masked keys.
- `POST /api/config`: Update provider, model, temperature, max tokens, and encrypted API keys.

### Redis Cache
- `GET /api/cache/stats`: Return hits, misses, hit ratio %, and active keys.
- `POST /api/cache/invalidate`: Invalidate keys by pattern (e.g. `*`, `cache:weather:*`).

### Analytics
- `GET /api/analytics/tokens`: Return total prompt/completion tokens, cost in USD, and breakdown by model and session.

### Documents & Knowledge Base
- `GET /api/documents`: List uploaded documents.
- `POST /api/documents/upload`: Upload file (`.txt`, `.md`, `.json`, `.csv`) and invalidate doc search cache.
- `DELETE /api/documents/{document_id}`: Remove document.
- `POST /api/documents/search`: Query documents directly.

---

## 11. Environment Variable Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `SECRET_KEY` | `mcp-secret-key-...` | 32-character key for encrypting stored credentials |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Database connection string (PostgreSQL or SQLite) |
| `REDIS_URL` | `redis://redis:6379/0` | Redis instance connection URL |
| `MCP_SERVER_URL` | `http://mcp_server:8001/sse`| Endpoint to MCP Server SSE stream |
| `MCP_SERVER_EXEC_URL` | `http://mcp_server:8001/api/tools/execute` | Fallback HTTP endpoint for direct tool execution |
| `DOCUMENTS_DIR` | `/app/data/documents` | Directory for uploaded searchable documents |
| `DEFAULT_PROVIDER` | `gemini` | Default active LLM provider (`gemini`, `openai`, `anthropic`) |
| `DEFAULT_MODEL` | `gemini-1.5-flash` | Default active model name |
| `GOOGLE_API_KEY` | *(optional)* | Google Gemini API Key |
| `OPENAI_API_KEY` | *(optional)* | OpenAI API Key |
| `ANTHROPIC_API_KEY` | *(optional)* | Anthropic API Key |

*(Note: API keys can also be configured dynamically in the UI Settings modal at any time).*

---

## 12. Docker Deployment & Getting Started

The entire application can be started with a single Docker Compose command:

```bash
docker compose up --build
```

### Services Started:
- **React Frontend**: Accessible at `http://localhost:3000`
- **FastAPI Backend**: Accessible at `http://localhost:8000` (API Docs: `http://localhost:8000/docs`)
- **MCP Server**: Accessible at `http://localhost:8001` (Health: `http://localhost:8001/health`)
- **Redis Cache**: Port `6379`
- **PostgreSQL Database**: Port `5432`

To shut down services:
```bash
docker compose down
```

---

## 13. Local Development Setup

If you prefer to run services individually without Docker:

### Prerequisites:
- Python 3.11+
- Node.js 18+ and npm
- (Optional) Local Redis instance

### 1. Set Up Backend & MCP Server:
```bash
# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

### 2. Start MCP Server:
```bash
python mcp_server/server.py
# Runs on http://localhost:8001
```

### 3. Start FastAPI Backend:
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Runs on http://localhost:8000
```

### 4. Start React Frontend:
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000 (proxies /api to localhost:8000)
```

---

## 14. Running Tests

The test suite covers calculator evaluation, live weather retrieval, Redis caching with TTL and hit/miss tracking, API key encryption/masking, and session lifecycles.

Execute tests with pytest:
```bash
pytest backend/tests -v
```

Expected output:
```text
backend/tests/test_cache.py::test_cache_miss_and_hit PASSED
backend/tests/test_cache.py::test_cache_invalidation PASSED
backend/tests/test_calculator.py::test_basic_arithmetic PASSED
backend/tests/test_calculator.py::test_operator_precedence PASSED
backend/tests/test_calculator.py::test_constants PASSED
backend/tests/test_calculator.py::test_functions PASSED
backend/tests/test_calculator.py::test_division_by_zero PASSED
backend/tests/test_calculator.py::test_syntax_error PASSED
backend/tests/test_calculator.py::test_empty_expression PASSED
backend/tests/test_chat.py::test_session_lifecycle PASSED
backend/tests/test_config.py::test_encryption_and_decryption PASSED
backend/tests/test_config.py::test_api_key_masking PASSED
backend/tests/test_weather.py::test_weather_retrieval_success PASSED
backend/tests/test_weather.py::test_weather_invalid_location PASSED

============================= 14 passed in 26.37s =============================
```

---

## 15. Known Limitations & Future Improvements

1. **Vector Embeddings for Large Knowledge Bases**:
   - *Current*: Document search uses chunked keyword/term frequency scoring and BM25-style relevance.
   - *Improvement*: Integrate ChromaDB or pgvector with embeddings (`text-embedding-3-small` / Gemini embeddings) for dense semantic retrieval.
2. **Audio/Voice Streaming**:
   - Integrate WebRTC / Live API for low-latency bidirectional voice chat with tool execution.
3. **Multi-Agent Collaboration**:
   - Implement hierarchical LangGraph graphs with specialized supervisor and worker agents for complex research or coding tasks.
4. **Export & Sharing**:
   - Allow exporting conversations to Markdown, PDF, or shareable public links.

