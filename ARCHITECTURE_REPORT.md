# CodePilot: AI-Powered Codebase Analysis & Chat System

## 1. Project Overview

**CodePilot** is an AI-powered application that autonomously analyzes any GitHub repository and enables interactive questioning about its codebase. Users paste a GitHub URL, the system analyzes the repository architecture and code, and then they can chat about it using AI context awareness.

**Key Features:**
- Automated GitHub repository analysis
- AI-powered codebase understanding  
- Interactive chat interface with repo context
- Multi-backend support (Augment Code SDK, OpenAI API)
- Semantic knowledge indexing (Senso.ai integration)
- TypeScript-based end-to-end type safety

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js + React 19)                          │
│  ├─ Home Page (repo URL input)                          │
│  ├─ Chat Page (interactive assistant UI)               │
│  └─ Assistant Component (sidebar, threads, chat)        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  API Routes (Next.js App Router)                        │
│  ├─ POST /api/analyze (orchestrates pipeline)          │
│  └─ POST /api/chat (context-aware responses)           │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Service Layer                                          │
│  ├─ GitHubClient (repo metadata, tree, content)        │
│  ├─ AugmentClient (Auggie SDK / OpenAI analysis)       │
│  ├─ SensoClient (knowledge indexing & search)          │
│  └─ InMemoryStore (analyzed repo cache)                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  External APIs                                          │
│  ├─ GitHub REST API (repository data)                  │
│  ├─ Augment Code SDK (AI analysis)                     │
│  ├─ OpenAI API (fallback & chat)                       │
│  └─ Senso.ai API (semantic search)                     │
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
- **LLM Provider:** OpenAI (gpt-4.1-mini, gpt-4.1-nano)

**Development Tools:**
- **Linting:** Biomejs 2.4.9
- **Type Checking:** TypeScript 5.9
- **Package Manager:** npm
- **Build Tool:** Turbopack

---

## 4. Key Components

### Frontend Components
| Component | Location | Responsibility |
|-----------|----------|-----------------|
| **Home Page** | `app/page.tsx` | Landing page with repo URL input, progress tracking, error handling |
| **Chat Page** | `app/chat/page.tsx` | Chat interface with repo context header, Suspense fallback |
| **Assistant** | `app/assistant.tsx` | AI assistant UI wrapper (sidebar, thread, breadcrumb) |
| **Thread** | `components/assistant-ui/thread.tsx` | Chat message rendering and input area |
| **ThreadListSidebar** | `components/assistant-ui/threadlist-sidebar.tsx` | Conversation history navigation |

### Backend Services
| Service | File | Responsibility |
|---------|------|-----------------|
| **GitHubClient** | `lib/github.ts` | Parse URLs, fetch repo metadata, tree navigation, file content |
| **AugmentClient** | `lib/augment.ts` | Codebase analysis via Auggie SDK or OpenAI fallback |
| **SensoClient** | `lib/senso.ts` | Knowledge indexing and semantic search |
| **Store** | `lib/store.ts` | In-memory repository cache and context prompt builder |

### API Routes
| Route | File | Responsibility |
|-------|------|-----------------|
| **POST /api/analyze** | `app/api/analyze/route.ts` | Orchestrate analysis pipeline (GitHub → Augment → Senso → Store) |
| **POST /api/chat** | `app/api/chat/route.ts` | Handle chat requests with repo context, stream responses |

---

## 5. Entry Points

### User Entry Flow
1. **Home Page (`/`)** - User lands here, enters GitHub repo URL
2. **Submission** - User clicks "Analyze" or presses Enter
3. **API Call** - Frontend POSTs to `/api/analyze`
4. **Redirect** - On success, navigate to `/chat?owner=X&repo=Y`

### Analysis Pipeline Entry
- **POST /api/analyze** - Orchestrates full analysis
- **Outputs:** JSON response with metadata and redirects frontend to chat

### Chat Flow Entry  
- **Chat Page Load** - Extracts owner/repo from URL params
- **POST /api/chat** - Sends user messages with repo context

---

## 6. Data Flow

```
User GitHub URL Input
    ↓
[GitHub] Fetch repo metadata (description, language, stars, topics)
    ↓
[GitHub] Fetch file tree (recursive structure)
    ↓
[GitHub] Select ~30 key files (patterns: package.json, README, src/*, etc.)
    ↓
[GitHub] Fetch file contents (raw from raw.githubusercontent.com)
    ↓
[Augment/OpenAI] Analyze codebase
    ├─ Generate project overview (comprehensive markdown)
    └─ Generate per-file summaries (1-2 sentences each)
    ↓
[Senso.ai] Index analyzed content (embeddings for semantic search)
    ↓
[Store] Cache analyzed repo in memory with metadata
    ↓
[Frontend] Redirect to chat page with repo params
    ↓
User Asks Question
    ↓
[Chat Route] Retrieve cached repo context from store
    ↓
[OpenAI/Augment] Generate response with context injection
    ↓
[Stream] Send response back to frontend in real-time
```

---

## 7. Getting Started Guide

### Prerequisites
- **Node.js** 18+ (as per package.json engines)
- **npm** or equivalent package manager
- **GitHub token** (optional, for higher API rate limits)
- **OpenAI API key** (required)
- **Senso.ai API key** (optional, for knowledge indexing)

### Installation & Setup

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd codepilot
npm install

# 2. Configure environment (.env.local)
OPENAI_API_KEY=sk-...                    # Required
GITHUB_TOKEN=ghp_...                     # Optional, increases rate limits
SENSO_API_KEY=...                        # Optional
AUGMENT_CLI_PATH=...                     # Optional

# 3. Start development server
npm run dev

# 4. Open browser
# http://localhost:3000

# 5. Paste a GitHub URL (e.g., https://github.com/sindresorhus/is)
# Wait for analysis, then chat about the codebase
```

### Development Workflow

1. **Frontend Changes**
   - Edit `app/`, `components/`
   - Next.js hot reload applies changes automatically
   - Tailwind CSS compiles on-the-fly

2. **Backend API Changes**
   - Edit `app/api/`, `lib/`
   - API routes auto-reload
   - Services may need manual restart

3. **Type Safety**
   - `npm run lint` - Check types and linting
   - `npm run lint:fix` - Auto-fix issues

4. **Production Build**
   - `npm run build` - Compile TypeScript, optimize assets
   - `npm start` - Run production server

### Key Files to Study First
1. `app/page.tsx` - Home page flow
2. `lib/github.ts` - GitHub integration and key file selection
3. `app/api/analyze/route.ts` - Full analysis orchestration
4. `lib/store.ts` - Data model for cached repos
5. `app/api/chat/route.ts` - Chat with context injection
6. `app/assistant.tsx` - UI framework setup

### Common Development Tasks

**Add a new analysis service:**
1. Create client in `lib/[service].ts` (model after `augment.ts`)
2. Integrate into `app/api/analyze/route.ts`
3. Update error handling and fallback strategy

**Modify file selection logic:**
- Edit `KEY_FILE_PATTERNS` in `lib/github.ts`
- Adjust `maxFiles` parameter in `selectKeyFiles()`

**Customize chat system prompt:**
- Edit system prompt in `app/api/chat/route.ts`
- Add repo context via `buildContextPrompt()` in `lib/store.ts`

### Production Deployment Notes

- Uses Vercel AI SDK (compatible with Vercel platform)
- Environment variables must be set before build
- In-memory store resets on server restart (use Redis in production)
- Senso.ai integration gracefully degrades if API unavailable
- Recommend deploying on Vercel for optimal Next.js performance
