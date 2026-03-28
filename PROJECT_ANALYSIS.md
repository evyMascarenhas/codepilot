# CodePilot: Project Analysis Report

## 1. Project Overview

**CodePilot** is an AI-powered application that autonomously analyzes any GitHub repository and enables interactive questioning about its codebase. Users provide a GitHub URL, the system automatically analyzes the repository's architecture and code, and users can then chat about it using AI-enhanced context awareness.

**Key Features:**
- Automated GitHub repository analysis and understanding
- Multi-backend AI analysis (Augment Code SDK with OpenAI fallback)
- Interactive ChatGPT-like interface for codebase exploration
- Semantic knowledge indexing (Senso.ai integration)
- End-to-end TypeScript type safety
- Real-time progress tracking during analysis
- Repository metadata extraction (stars, topics, language, description)

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Frontend (Next.js App Router)              │
│  ├─ Home Page (/) - Repo URL input, progress tracking  │
│  ├─ Chat Page (/chat) - Interactive chat interface     │
│  └─ Assistant UI - ChatGPT-like layout                 │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│           API Layer (Next.js Route Handlers)            │
│  ├─ POST /api/analyze - Orchestrate analysis pipeline  │
│  └─ POST /api/chat - Chat with repo context            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 Service Layer                          │
│  ├─ GitHubClient - Repo metadata, tree, file content  │
│  ├─ AugmentClient - Codebase analysis via Auggie SDK  │
│  ├─ SensoClient - Knowledge indexing & search         │
│  └─ InMemoryStore - Analyzed repo cache              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              External APIs                             │
│  ├─ GitHub REST API (repository data)                 │
│  ├─ Augment Code SDK (AI analysis engine)            │
│  ├─ OpenAI API (chat & fallback analysis)            │
│  └─ Senso.ai API (semantic search indexing)          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

**Frontend:**
- **Framework:** Next.js 16.2 (React 19, App Router, Turbopack)
- **UI Components:** Radix UI, assistant-ui (ChatGPT-like interface)
- **Styling:** Tailwind CSS 4.2, PostCSS
- **State Management:** Zustand 5.0
- **Icons:** Lucide React
- **Markdown:** Remark GFM

**Backend:**
- **Runtime:** Node.js 18+
- **Framework:** Next.js API Routes (App Router)
- **Language:** TypeScript 5.9
- **LLM Integration:** Vercel AI SDK v6, OpenAI API
- **HTTP Client:** Fetch API (native)

**External Services:**
- **Code Analysis:** Augment Code (@augmentcode/auggie-sdk)
- **Code Hosting:** GitHub REST API v3
- **Knowledge Base:** Senso.ai API
- **LLM Provider:** OpenAI (gpt-4-mini, gpt-4-nano models)

**Development Tools:**
- **Linting:** Biomejs 2.4.9
- **Type Checking:** TypeScript 5.9
- **Package Manager:** npm
- **Build Tool:** Turbopack (Next.js 16.2)

---

## 4. Key Components

### Frontend Components
| Component | Location | Purpose |
|-----------|----------|---------|
| **Home Page** | `app/page.tsx` | Landing page, repo URL input, progress tracking |
| **Chat Page** | `app/chat/page.tsx` | Interactive chat interface with repo context |
| **Assistant** | `app/assistant.tsx` | AI assistant UI wrapper (sidebar, thread layout) |
| **Thread** | `components/assistant-ui/thread.tsx` | Chat message rendering and input |
| **ThreadList** | `components/assistant-ui/threadlist-sidebar.tsx` | Conversation history navigation |

### Backend Services
| Service | File | Responsibility |
|---------|------|-----------------|
| **GitHubClient** | `lib/github.ts` | URL parsing, repo metadata, tree fetching, file content retrieval |
| **AugmentClient** | `lib/augment.ts` | Codebase analysis via Auggie SDK or OpenAI fallback |
| **SensoClient** | `lib/senso.ts` | Knowledge base creation, indexing, semantic search |
| **Store** | `lib/store.ts` | In-memory repo cache, context prompt building |

### API Routes
| Endpoint | File | Function |
|----------|------|----------|
| **POST /api/analyze** | `app/api/analyze/route.ts` | Full analysis pipeline orchestration |
| **POST /api/chat** | `app/api/chat/route.ts` | Chat with repo context injection, streaming |

---

## 5. Entry Points

### User Journey
1. **Home Page (`/`)** - User lands, enters GitHub repo URL
2. **Submit Analysis** - Click "Analyze" or press Enter
3. **Backend Processing** - `/api/analyze` executes full pipeline
4. **Redirect to Chat** - Router navigates to `/chat?owner=X&repo=Y`
5. **Chat Interface** - User asks questions about the analyzed codebase

### Analysis Pipeline Entry
- **Request:** POST `/api/analyze` with `{ repoUrl: string }`
- **Response:** `{ owner, repo, error? }` JSON
- **Side Effect:** Repository analysis cached in memory, ready for chat

---

## 6. Data Flow

### Analysis Workflow
```
User Input (GitHub URL)
    ↓
[GitHub] Fetch repo metadata (stars, language, description, topics)
    ↓
[GitHub] Fetch recursive file tree (all files and directories)
    ↓
[GitHub] Select ~30 key files (patterns: package.json, README, src/*, etc.)
    ↓
[GitHub] Fetch file contents (raw files from raw.githubusercontent.com)
    ↓
[Augment Code/OpenAI] Analyze codebase
    ├─ Generate comprehensive markdown overview
    └─ Generate per-file summaries (1-2 sentences each)
    ↓
[Senso.ai] Index analyzed content (create embeddings for semantic search)
    ↓
[Store] Cache analyzed repo in memory with all metadata
    ↓
[Frontend] Navigate to chat interface with repo context ready
```

### Chat Data Flow
```
User Question
    ↓
[Chat Route] Retrieve cached repo from store
    ↓
[OpenAI] Generate response with context injection
    ↓
[Stream] Send response chunks back to frontend
    ↓
[UI] Render message in chat interface
```

---

## 7. Getting Started

### Prerequisites
- Node.js 18+
- npm or compatible package manager
- GitHub token (optional, for API rate limits)
- OpenAI API key (required for chat)
- Senso.ai API key (optional, for knowledge indexing)

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd codepilot

# Install dependencies
npm install

# Configure environment
cat > .env.local << EOF
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...  (optional)
SENSO_API_KEY=...     (optional)
EOF

# Start development server
npm run dev

# Open http://localhost:3000
```

### Development Workflow
1. **Frontend:** Edit `app/`, `components/` → Next.js auto-reload
2. **Backend:** Edit `app/api/`, `lib/` → API auto-reload
3. **Linting:** `npm run lint` → Check types and style
4. **Type Safety:** `npm run lint:fix` → Auto-fix issues
5. **Production Build:** `npm run build && npm start`

### Key Files to Study
1. `app/page.tsx` - Home page flow and error handling
2. `lib/github.ts` - GitHub integration and key file selection logic
3. `app/api/analyze/route.ts` - Full analysis pipeline orchestration
4. `lib/store.ts` - In-memory cache data model
5. `app/api/chat/route.ts` - Chat with context injection
6. `app/assistant.tsx` - UI framework setup

### Common Tasks
- **Add analysis service:** Create `lib/[service].ts`, integrate into `/api/analyze`
- **Modify file selection:** Edit `KEY_FILE_PATTERNS` in `lib/github.ts`
- **Change LLM model:** Update model names in `lib/augment.ts` or `app/api/chat/route.ts`
