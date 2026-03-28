# Dexter 🤖 - Project Analysis Report

## 1. Project Overview

**Dexter** is an autonomous financial research agent built with TypeScript/Bun that performs complex financial analysis through intelligent task decomposition, autonomous tool execution, and self-validation. It combines Claude-powered reasoning with real-time market data access to deliver data-backed financial insights.

**Key Capabilities:**
- **Intelligent Task Planning**: Decomposes financial queries into structured research steps
- **Autonomous Execution**: Selects and executes tools to gather market data (income statements, balance sheets, cash flows)
- **Self-Validation**: Checks and refines results until confident
- **Real-Time Data**: Access to live financial statements and market data
- **Safety Features**: Loop detection, step limits, tool usage tracking
- **Multi-Channel Support**: CLI, WhatsApp, Gateway integration
- **Memory System**: Persistent state and knowledge recall

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│          USER INPUT (CLI, WhatsApp, Gateway)            │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│           AGENT CORE (Agent Class)                       │
│  ├─ Query Processing & System Prompt Building           │
│  ├─ Agent Loop (up to maxIterations)                    │
│  ├─ LLM Calls (Claude, OpenAI, Google, Ollama)          │
│  ├─ Tool Execution & Streaming Events                  │
│  ├─ Memory Management & Context Cleanup                │
│  └─ Token Tracking & Context Overflow Handling          │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────┐ ┌──────▼──────┐ ┌────▼────────────┐
│ Tool Exec  │ │ Memory Mgmt │ │ Scratchpad      │
│ ├─ Tool    │ │ ├─ Recall   │ │ ├─ History Log  │
│ │  Registry│ │ ├─ Flush    │ │ ├─ Token Tracker│
│ ├─ Approval│ │ └─ Compress │ │ └─ Tool Limits  │
│ └─ Limits  │ └────────────┘ └─────────────────┘
└────┬───────┘
     │
┌────▼──────────────────────────────────────────┐
│        TOOLS (get_financials, web_search,     │
│        stock_screener, write_file, etc.)      │
└────┬──────────────────────────────────────────┘
     │
┌────▼──────────────────────────────────────────┐
│   EXTERNAL DATA (Market APIs, Web Scraping,   │
│   Financial Databases, File System)           │
└─────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Bun v1.0+ |
| **Language** | TypeScript 5.9 |
| **LLM Framework** | LangChain Core (@langchain/*) |
| **Model Providers** | Anthropic (Claude), OpenAI, Google Genai, Ollama, Tavily |
| **Data Tools** | Exa (web search), Tavily (search), Baileys (WhatsApp) |
| **Browser** | Playwright 1.58.2 (chromium) |
| **Database** | SQLite (better-sqlite3) |
| **UI** | pi-tui (terminal TUI) |
| **Task Scheduling** | Croner (cron-like tasks) |
| **Testing** | Bun Test |
| **Type Validation** | Zod |
| **Dev Tools** | tsx, TypeScript, Jest (with ts-jest) |

---

## 4. Key Components

### Core Agent Components

| Component | File | Purpose |
|-----------|------|---------|
| **Agent** | `src/agent/agent.ts` | Main agent loop, LLM orchestration, event streaming |
| **Scratchpad** | `src/agent/scratchpad.ts` | Append-only history log, tool usage tracking, soft limits |
| **Tool Executor** | `src/agent/tool-executor.ts` | Tool invocation, approval workflow, error handling |
| **Token Counter** | `src/agent/token-counter.ts` | Token usage tracking across LLM calls |
| **Run Context** | `src/agent/run-context.ts` | Session state (query, scratchpad, tokens, iteration) |
| **Prompts** | `src/agent/prompts.ts` | System prompt building, skill discovery, SOUL.md integration |
| **Types** | `src/agent/types.ts` | Agent config, events, approval decisions, channel profiles |
| **Channels** | `src/agent/channels.ts` | Channel-specific formatting (CLI, WhatsApp) |

### UI & CLI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **CLI Runner** | `src/cli.ts` | Main TUI interface, input handling, message display |
| **Controllers** | `src/controllers/` | Input history, model selection, agent runner |
| **Components** | `src/components/` | Chat logs, approval prompts, debug panels |
| **Theme** | `src/theme.ts` | Color scheme and styling for terminal UI |

### Tools & Extensions

| Module | Location | Purpose |
|--------|----------|---------|
| **Tool Registry** | `src/tools/registry.ts` | Tool discovery and execution framework |
| **Skills** | `src/skills/` | Extensible skill system (LLM-powered plugins) |
| **Providers** | `src/providers.ts` | LLM provider abstraction and routing |
| **Memory** | `src/memory/` | Knowledge base, recall, flush mechanisms |

### Gateway & Integration

| Component | Location | Purpose |
|-----------|----------|---------|
| **Gateway** | `src/gateway/` | WhatsApp bot bridge, authentication |
| **LLM Model** | `src/model/llm.ts` | Unified LLM call interface |
| **Utils** | `src/utils/` | AI message parsing, token estimation, error handling |

---

## 5. Entry Points

### Primary Entry Points

1. **`src/index.tsx`** - Main CLI entry point
   - Loads environment variables
   - Calls `runCli()` function

2. **`src/cli.ts`** - TUI application
   - Initializes pi-tui terminal interface
   - Creates agent runner controller
   - Handles user input and streams agent events

3. **`src/gateway/index.ts`** - WhatsApp gateway
   - `run` command: Start WhatsApp bot listener
   - `login` command: Authenticate WhatsApp connection

### Script Commands (package.json)

```bash
npm start              # Run CLI
npm run dev           # Watch mode
npm run gateway       # Start WhatsApp gateway
npm run gateway:login # Authenticate WhatsApp
npm run test          # Run tests
npm run test:watch    # Watch tests
npm run typecheck     # Verify TypeScript
```

---

## 6. Data Flow

### Agent Execution Loop

```
User Query
    ↓
[System Prompt Building]
  ├─ Load SOUL.md (optional personality)
  ├─ Build channel profile (CLI/WhatsApp)
  ├─ Discover available skills
  ├─ Build tool descriptions
  └─ Inject context & memory
    ↓
[LLM Call] Send prompt + chat history
    ↓
[Tool Calls?] ────→ [Tool Execution]
     │                ├─ Request approval (if needed)
     │                ├─ Execute tool
     │                ├─ Track usage (soft limits)
     │                ├─ Emit events
     │                └─ Return result
     │
     └────────────────→ Append to chat history
                             ↓
                    [Check Loop Condition]
                    ├─ Max iterations?
                    ├─ Stop signal?
                    ├─ Tool limit exceeded?
                    └─ Context overflow?
                             ↓
                    Loop again or finish
                             ↓
                    [Done Event] ─→ UI
```

### Tool Execution Flow

```
Tool Call (name, args)
    ↓
[Check Deduplication]
  └─ Skills: Only run once per query
    ↓
[Approval Gate?]
  ├─ write_file, edit_file require approval
  └─ Check session-approved tools
    ↓
[Execute]
  ├─ Emit ToolStartEvent
  ├─ Execute with progress channel
  ├─ Emit ToolProgressEvent(s)
  └─ Emit ToolEndEvent | ToolErrorEvent
    ↓
[Limit Check]
  ├─ Increment call count
  ├─ Check per-tool limit (default: 3)
  ├─ Detect similar queries (prevent loops)
  └─ Emit ToolLimitEvent if blocked
```

### Memory & Context Management

```
Large Response / Context Overflow
    ↓
[Token Estimation]
  ├─ Estimate message token count
  ├─ Compare to CONTEXT_THRESHOLD
  └─ Retry with overflow strategy
    ↓
[Cleanup Strategy]
  ├─ Keep tool uses (KEEP_TOOL_USES)
  ├─ Discard old reasoning
  ├─ Summarize if needed
  └─ Flush memory if configured
    ↓
[Memory Flush]
  ├─ Save important facts to DB
  ├─ Compress chat history
  └─ Continue with reduced context
```

---

## 7. Getting Started Guide

### Prerequisites

- **Bun** v1.0 or later (install: `curl -fsSL https://bun.sh/install | bash`)
- **.env file** with required API keys:
  - `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY` for Claude)
  - `EXA_API_KEY` or `TAVILY_API_KEY` (for web search)
  - Optional: `WHATSAPP_*` keys (for WhatsApp bot)

### Installation

```bash
# Clone and install
git clone <repo-url>
cd dexter
bun install

# Create .env
cat > .env << EOF
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
EXA_API_KEY=...
EOF
```

### Running

```bash
# Start CLI
bun start

# Watch mode development
bun run dev

# Run tests
bun test

# Start WhatsApp gateway
bun run gateway
```

### Configuration Options

Set in `.env`:
- `MODEL` - LLM model to use (default: gpt-5.4)
- `MODEL_PROVIDER` - Provider: openai, anthropic, google, ollama
- `MAX_ITERATIONS` - Agent loop limit (default: 10)
- `CHANNEL` - Output channel: cli, whatsapp

### Key Files to Study

1. **`src/agent/agent.ts`** - Core agent loop logic
2. **`src/cli.ts`** - Terminal UI and user interaction
3. **`src/tools/registry.ts`** - Available tools & tool framework
4. **`src/agent/prompts.ts`** - System prompt construction
5. **`src/memory/`** - Memory system and state management
6. **`src/gateway/index.ts`** - WhatsApp integration

### Common Tasks

**Add a new tool:**
1. Create tool function in `src/tools/`
2. Register in `src/tools/registry.ts`
3. Add to tool descriptions

**Modify system prompt:**
- Edit `src/agent/prompts.ts` buildSystemPrompt()
- Or create custom `SOUL.md` in user directory

**Enable memory system:**
- Set `MEMORY_ENABLED=true` in .env
- Configure DB path via `DEXTER_PATH` env var

**Add WhatsApp skill:**
- Create skill in `src/skills/`
- Auto-discovered and injected into system prompt
