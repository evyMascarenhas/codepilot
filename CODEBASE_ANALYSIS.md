# CodePilot - Comprehensive Codebase Analysis

## 1. Project Overview

**CodePilot** is an AI-powered codebase onboarding platform that autonomously analyzes any GitHub repository and enables users to chat with the codebase. It was built for the Multimodal Frontier Hackathon 2026.

**Core Value Proposition:**
- Paste a GitHub repo URL → CodePilot analyzes the entire codebase → Chat with the analyzed code
- Reduces codebase onboarding time from days to minutes
- Uses AI agents to understand architecture, patterns, dependencies, and code structure

**Key Features:**
- GitHub repository URL parsing and analysis
- Autonomous codebase inspection (file tree navigation, content fetching)
- AI-powered code analysis (via Augment Code SDK with OpenAI fallback)
- Interactive chat interface for asking questions about analyzed codebases
- Knowledge base indexing via Senso.ai for semantic search
- Multi-repository support with persistent session management

## 2. Architecture

**High-Level System Design:**

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js React)                                   │
│  ├─ Landing Page (Home) - repo URL input                    │
│  ├─ Chat Page - interactive conversation interface          │
│  └─ Assistant UI (assistant-ui library integration)         │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│  Backend API Layer (Next.js App Router)                     │
│  ├─ /api/analyze - GitHub analysis orchestration            │
│  └─ /api/chat - LLM-powered chat responses                  │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│  Integration Services                                        │
│  ├─ GitHub API Client (repo info, tree, file content)       │
│  ├─ Augment Code SDK (primary analysis)                     │
│  ├─ OpenAI API (fallback analysis & chat)                   │
│  └─ Senso.ai API (knowledge indexing & retrieval)           │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│  Data Storage Layer                                          │
│  ├─ In-Memory Store (analyzed repo cache)                   │
│  └─ Senso.ai Knowledge Base (semantic embeddings)           │
└─────────────────────────────────────────────────────────────┘
```

**Architecture Patterns:**
- **Client-Server with Orchestration:** Frontend triggers backend analysis job
- **Fallback Strategy:** Primary service (Augment) → Secondary service (OpenAI)
- **Lazy Analysis:** Repo analysis happens on-demand when user submits URL
- **Context Injection:** Analyzed repo data embedded in chat system prompts
- **Modular Service Integration:** Each external service (GitHub, Augment, Senso, OpenAI) has isolated client

## 3. Tech Stack

**Frontend:**
- **Framework:** Next.js 16.2 (React 19, App Router, Turbopack)
- **UI Components:** Radix UI, assistant-ui library (ChatGPT-like interface)
- **Styling:** Tailwind CSS 4.2, PostCSS
- **State Management:** Zustand 5.0
- **Icons:** Lucide React, Radix UI Slot
- **Markdown:** Remark GFM

**Backend:**
- **Framework:** Next.js API Routes (App Router)
- **LLM Integration:** Vercel AI SDK (v6), OpenAI API
- **Language:** TypeScript 5.9

**External Services:**
- **Codebase Analysis:** Augment Code (@augmentcode/auggie-sdk)
- **Code Hosting:** GitHub API
- **Knowledge Base:** Senso.ai
- **LLM Provider:** OpenAI (gpt-4.1-mini, gpt-4.1-nano models)

**Development Tools:**
- **Linting:** Biomejs 2.4.9
- **Type Checking:** TypeScript 5.9
- **Package Manager:** npm

## 4. Key Components & Responsibilities

### Frontend Components

| Component | Location | Responsibility |
|-----------|----------|-----------------|
| **Home Page** | `app/page.tsx` | Landing page with repo URL input, progress tracking, error handling |
| **Chat Page** | `app/chat/page.tsx` | Chat interface with repo context header, Suspense fallback |
| **Assistant Component** | `app/assistant.tsx` | AI assistant UI wrapper (sidebar, thread, breadcrumb navigation) |
| **Thread Component** | `components/assistant-ui/thread.tsx` | Chat message rendering and input area |
| **ThreadList Sidebar** | `components/assistant-ui/threadlist-sidebar.tsx` | Conversation history navigation |

### Backend Services

| Service | File | Responsibility |
|---------|------|-----------------|
| **GitHub Client** | `lib/github.ts` | Parse URLs, fetch repo metadata, tree navigation, file content retrieval |
| **Augment Client** | `lib/augment.ts` | Codebase analysis via Auggie SDK or OpenAI fallback |
| **Senso Client** | `lib/senso.ts` | Knowledge indexing and semantic search across analyzed repos |
| **Store** | `lib/store.ts` | In-memory repository cache and context prompt builder |

### API Routes

| Route | File | Responsibility |
|-------|------|-----------------|
| **POST /api/analyze** | `app/api/analyze/route.ts` | Orchestrate full analysis pipeline (GitHub → Augment → Senso → Store) |
| **POST /api/chat** | `app/api/chat/route.ts` | Handle chat requests with repo context, stream responses |

## 5. Entry Points

### User Entry Point
1. **Home Page (`/`)** - User lands here, enters GitHub repo URL
2. **Submission Trigger** - `handleAnalyze()` button or Enter key
3. **Analysis API Call** - Frontend posts to `/api/analyze`

### Analysis Flow Entry
- **POST /api/analyze** - Receives GitHub URL, orchestrates pipeline
- **Output:** Stores analyzed data in memory, redirects to `/chat?owner=X&repo=Y`

### Chat Flow Entry
- **GET /chat** - Loads chat interface with repo params
- **POST /api/chat** - Handles conversation, injects repo context into LLM

## 6. Data Flow

### Analysis Pipeline Data Flow

```
User URL Input
    ↓
[GitHub] Fetch repo metadata (description, language, stars, topics)
    ↓
[GitHub] Fetch file tree (recursive tree structure)
    ↓
[GitHub] Select ~30 key files (patterns: package.json, README, src/*, etc.)
    ↓
[GitHub] Fetch file contents (raw file data from raw.githubusercontent.com)
    ↓
[Augment/OpenAI] Analyze codebase
    ├─ Generate project overview (comprehensive markdown report)
    └─ Generate per-file summaries (1-2 sentences each)
    ↓
[Senso.ai] Index analyzed content (embeddings for semantic search)
    ↓
[Store] Cache analyzed repo in memory with metadata
    ↓
[Frontend] Redirect to chat page with repo params
```

### Chat Data Flow

```
User Message (Chat Page)
    ↓
Frontend sends POST /api/chat with:
    ├─ messages (conversation history)
    ├─ repoOwner & repoName (from URL params)
    └─ system prompt template
    ↓
[Backend] Build system prompt:
    ├─ Retrieve cached repo analysis from Store
    ├─ Query Senso.ai for semantic context (if configured)
    └─ Inject all context into system prompt
    ↓
[OpenAI/Augment] Generate response with full repo context
    ↓
Stream response back to frontend
    ↓
Render response in chat thread
```

## 7. Getting Started for New Developers

### Prerequisites
- Node.js 18+ (as per package.json engines)
- npm or equivalent package manager
- GitHub token (optional, for higher rate limits)
- OpenAI API key (required)
- Senso.ai API key (optional, for knowledge indexing)
- Augment Code CLI access (optional, primary analysis engine)

### Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (.env.local)
OPENAI_API_KEY=sk-...                    # Required
GITHUB_TOKEN=ghp_...                     # Optional, rate limit relief
SENSO_API_KEY=...                        # Optional, knowledge indexing
AUGMENT_CLI_PATH=...                     # Optional, Augment SDK path

# 3. Start development server
npm run dev

# 4. Open browser
# http://localhost:3000

# 5. Paste a GitHub URL (e.g., https://github.com/sindresorhus/is)
# Wait for analysis, then chat about the codebase
```

### Development Workflow

1. **Frontend Development**
   - Edit files in `app/`, `components/`
   - Next.js hot reload automatically applies changes
   - Tailwind CSS classes are compiled on-the-fly

2. **Backend API Development**
   - API routes in `app/api/` auto-reload
   - Services in `lib/` need manual restart on changes
   - Use browser DevTools to inspect Network tab for API calls

3. **Type Safety**
   - Run `npm run lint` to check types and linting
   - Fix issues with `npm run lint:fix`

4. **Building for Production**
   - `npm run build` - Compiles TypeScript, optimizes assets
   - `npm start` - Runs production server

### Key Files to Understand First

1. **`app/page.tsx`** - Home page flow and error handling
2. **`lib/github.ts`** - GitHub API integration (key file selection logic)
3. **`app/api/analyze/route.ts`** - Full analysis orchestration
4. **`lib/store.ts`** - Data model for cached repos
5. **`app/api/chat/route.ts`** - Chat with context injection
6. **`app/assistant.tsx`** - UI framework setup

### Common Development Tasks

**Add a new analysis source:**
1. Create client class in `lib/[service].ts` (model after `augment.ts`, `senso.ts`)
2. Import and integrate into `app/api/analyze/route.ts`
3. Update error handling and fallback strategy

**Modify file selection logic:**
- Edit `KEY_FILE_PATTERNS` and `KEY_DIR_ENTRY_PATTERNS` in `lib/github.ts`
- Adjust `maxFiles` parameter in `selectKeyFiles()` call

**Customize chat system prompt:**
- Edit system prompt in `app/api/chat/route.ts` (line 30)
- Add repo-specific context via `buildContextPrompt()` in `lib/store.ts`

**Add new API feature:**
- Create route in `app/api/[feature]/route.ts`
- Follow Next.js App Router conventions
- Import utilities from `lib/`

### Deployment Notes

- Uses Vercel AI SDK (compatible with Vercel platform)
- Environment variables must be set before build
- In-memory store will reset on server restart (use Redis in production)
- Senso.ai integration gracefully degrades if API unavailable
