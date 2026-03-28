# CodePilot: AI-Powered Codebase Onboarding — Complete Analysis Report

## 1. Project Overview

**CodePilot** is an AI-powered web application designed to accelerate developer onboarding by autonomously analyzing GitHub repositories and enabling conversational Q&A about codebases.

**Core Value Proposition:**
- Developers paste a GitHub URL → CodePilot analyzes the entire codebase in minutes
- Users ask natural language questions about architecture, patterns, and structure
- Eliminates days of manual exploration typically required for codebase onboarding

**Competition Context:**
Built for the Multimodal Frontier Hackathon 2026 by integrating Augment Code, Senso.ai, assistant-ui, and DigitalOcean.

---

## 2. Architecture

CodePilot follows a **client-server architecture** with distinct analysis and chat phases:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  /           │  │ /chat        │  │ Components   │       │
│  │  (Home Page) │  │ (Chat UI)    │  │ (Assistant)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↓↑
                    ┌─────────────────┐
                    │  API Routes     │
                    │  /api/analyze   │
                    │  /api/chat      │
                    └─────────────────┘
                            ↓↑
         ┌──────────────────┼──────────────────┐
         ↓                  ↓                  ↓
    ┌─────────┐      ┌──────────┐      ┌────────────┐
    │ GitHub  │      │ Augment  │      │ Senso.ai   │
    │ API     │      │ Code     │      │ Knowledge  │
    └─────────┘      │ (Auggie) │      │ Base       │
                     └──────────┘      └────────────┘
```

**Analysis Flow:**
1. User submits GitHub URL with optional personal access token (for private repos)
2. System fetches repo metadata, file tree, and key file contents
3. Augment Code (Auggie SDK) performs deep codebase analysis
4. Results stored in-memory and indexed in Senso.ai
5. Redirect to chat interface for Q&A

**Chat Flow:**
1. User question triggers chat API
2. System builds context prompt with analyzed repo data + Senso query results
3. Auggie SDK generates response with repository context
4. Streamed response delivered to UI

---

## 3. Tech Stack

**Frontend:**
- Next.js 16.2.1 (App Router, SSR/SSG)
- React 19.2.4 (Components, hooks)
- TypeScript 5.9.3 (Type safety)
- Tailwind CSS 4.2.2 + PostCSS 4.2.2 (Styling)
- assistant-ui (latest) + react-markdown (Chat UI framework)
- Radix UI primitives (Dialog, Tooltip, Separator, Avatar)
- Zustand 5.0.12 (Client state)
- lucide-react 1.7.0 (Icons)

**Backend:**
- Node.js 18+ runtime
- Express alternative: Next.js API Routes
- axios 1.13.6 (HTTP client)

**AI/ML:**
- Augment Code SDK (@augmentcode/auggie, @augmentcode/auggie-sdk)
- AI SDK (ai ^6.0.138, ai-v5, ai-sdk/openai)

**External Integrations:**
- GitHub API (v3 REST)
- Senso.ai Knowledge API
- OpenAI (fallback LLM)

**DevTools:**
- Biomejs 2.4.9 (Linting/formatting)
- Next.js turbopack (Fast dev builds)
- npm (Package management)

---

## 4. Key Components

### Frontend Components

**Page Components:**
- `app/page.tsx` - Home/landing page with GitHub URL input
- `app/chat/page.tsx` - Chat interface with analyzed repo context
- `app/assistant.tsx` - Assistant runtime provider + sidebar navigation

**UI Library Components:**
- `components/assistant-ui/` - Chat thread, message rendering, sidebar
- `components/ui/` - Radix-based: Tooltip, Separator, Breadcrumb, Sidebar
- `components/icons/` - Custom icon components

### Backend Libraries

**`lib/github.ts`** (GitHub Integration)
- `parseGitHubUrl()` - Extract owner/repo from URL
- `fetchRepoInfo()` - Get repo metadata (stars, description, language)
- `fetchRepoTree()` - Recursive file tree enumeration
- `fetchFileContent()` - Raw content download
- `selectKeyFiles()` - Intelligent file selection (KEY_FILE_PATTERNS, KEY_DIR_ENTRY_PATTERNS)
- `ghHeaders()` - Auth header construction (supports personal tokens)

**`lib/augment.ts`** (Augment Code Integration)
- `AugmentClient` class - Codebase analysis wrapper
- `analyzeCodebase()` - Batch file analysis via Auggie SDK
- `chatWithAuggie()` - Streaming chat responses with context

**`lib/senso.ts`** (Senso.ai Knowledge Integration)
- `SensoClient` class - Knowledge indexing & retrieval
- `createOrganization()` - Per-repo organization creation
- `indexKnowledge()` - Document chunking & indexing
- `queryKnowledge()` - Semantic search (top_k=5)

**`lib/store.ts`** (In-Memory State)
- `AnalyzedRepo` interface - Complete repo analysis schema
- `storeAnalyzedRepo()` - Cache analyzed repos
- `getAnalyzedRepo()` - Retrieve analysis by owner/repo
- `buildContextPrompt()` - Format context for LLM system prompt

### API Routes

**`/api/analyze` (POST)**
- Orchestrates full analysis pipeline
- Returns: filesAnalyzed, sensoIndexed, augmentUsed flags

**`/api/chat` (POST)**
- Generates streamed responses with repo context
- Queries Senso before LLM generation
- Uses Auggie SDK as primary LLM

---

## 5. Entry Points

| Entry Point | Type | Purpose |
|---|---|---|
| `http://localhost:3000/` | GET | Landing page - GitHub URL input |
| `http://localhost:3000/chat?owner=X&repo=Y` | GET | Chat interface after analysis |
| `POST /api/analyze` | API | Trigger codebase analysis |
| `POST /api/chat` | API | Submit questions, get responses |

---

## 6. Data Flow

### Analysis Pipeline (Detailed)

```
Input: repoUrl, optional ghToken
  ↓
[1] Parse URL → extract owner/repo
  ↓
[2] Fetch repo metadata (stars, language, topics)
  ↓
[3] Fetch full file tree (recursive=1)
  ↓
[4] Select ~30 key files based on:
    - File name patterns (README, package.json, Dockerfile, etc.)
    - Directory patterns (src/, app/, lib/, api/)
    - Language extensions (.ts, .tsx, .py, .go, .rs)
    - Exclude: node_modules, vendor, dist/, .min.
  ↓
[5] Fetch file contents for selected files
  ↓
[6] Augment Code Analysis
    - Slice files to 2000 chars (manageable prompt)
    - Send to Auggie SDK: "Analyze files → report with Overview, Architecture, Tech Stack, Components, Entry Points, Data Flow, Getting Started"
    - Receive markdown report
  ↓
[7] Senso.ai Indexing (if configured)
    - Create org: `codepilot-{owner}-{repo}`
    - Index documents: overview + file summaries
  ↓
[8] In-Memory Storage
    - Cache AnalyzedRepo with all metadata, tree overview, analyses
    - TTL: Session lifetime (no persistence in MVP)
  ↓
Output: { success, owner, repo, filesAnalyzed, sensoIndexed }
```

### Chat Pipeline

```
Input: messages[], repoOwner, repoName, optional system prompt
  ↓
[1] Build system prompt (base + repo context)
  ↓
[2] Retrieve AnalyzedRepo from store
  ↓
[3] If Senso configured:
    - Extract last user message text
    - Query Senso knowledge base for relevant chunks
    - Append to system prompt
  ↓
[4] Call Auggie SDK with:
    - System prompt (with context + Senso results)
    - Last user message as query
  ↓
[5] Stream response in 20-char chunks via AI SDK
  ↓
Output: UIMessageStream
```

---

## 7. Getting Started Guide

### Prerequisites
- Node.js 18+
- GitHub account + personal access token (for private repos)
- Optionally: Augment Code account, Senso.ai account, OpenAI API key

### Installation

```bash
# Clone & install
git clone <repo-url>
cd codepilot
npm install

# Configure environment
cp .env.example .env.local
# Add to .env.local:
# OPENAI_API_KEY=sk-...        # Fallback LLM
# SENSO_API_KEY=...            # Optional knowledge base
# GITHUB_TOKEN=ghp_...         # Optional (for rate limiting)
```

### Development

```bash
# Start dev server
npm run dev                    # Runs on http://localhost:3000

# Code quality
npm run lint                   # Biomejs check
npm run lint:fix              # Auto-fix linting issues
npm run format:fix            # Format code
```

### Production

```bash
npm run build                  # Next.js build
npm start                      # Serve on http://localhost:3000
```

### First Run

1. Open http://localhost:3000
2. Paste GitHub URL (e.g., `https://github.com/vercel/next.js`)
3. Optional: Add GitHub token for private repos
4. Click "Analyze →"
5. Wait for analysis (typically 30-60 seconds)
6. Chat interface loads—ask questions about architecture, files, setup

### Key Configuration
- `.env.local`: API keys, tokens
- `next.config.ts`: Next.js build settings
- `tsconfig.json`: TypeScript strict mode
- `package.json`: Dependencies, scripts
- `components.json`: Radix UI setup

---

## 8. Notable Implementation Details

**Smart File Selection:**
- Prioritizes config files, entry points, and common patterns
- Filters large files (>50KB) to avoid prompt bloat
- Supports multi-language projects (Node.js, Python, Go, Rust, Java, Ruby)

**Fallback Strategies:**
- Senso API failures → graceful degradation to local analysis
- GitHub token optional → works with public repos
- In-memory store → no external database dependency (MVP)

**Security:**
- GitHub tokens passed per-request, not stored
- Senso/OpenAI credentials in environment only
- XSS protection via React/Next.js defaults

**Performance:**
- Next.js Turbopack for fast builds
- Selective file fetching (~30 key files, not full clone)
- Streaming chat responses for perceived responsiveness

---

## Contact & Community

Built for **Multimodal Frontier Hackathon 2026** using:
- Augment Code (codebase intelligence)
- Senso.ai (knowledge retrieval)
- assistant-ui (chat UX)
- DigitalOcean (hosting)
