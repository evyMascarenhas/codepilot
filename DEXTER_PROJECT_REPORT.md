# Dexter 🤖 - Project Analysis Report

## 1. Project Overview

**Dexter** is an autonomous financial research agent built with TypeScript that combines advanced AI capabilities with real-time financial data access. It functions as a sophisticated research companion that decomposes complex financial questions into structured research plans, executes them autonomously, validates results, and refines answers iteratively.

**Key Vision**: "Think Claude Code, but built specifically for financial research."

**Version**: 2026.3.25 | **Runtime**: Bun (v1.0+) | **Language**: TypeScript/TSX

**Core Capabilities**:
- Intelligent task planning and decomposition
- Autonomous tool execution with self-validation
- Real-time financial data access (income statements, balance sheets, cash flow)
- Safety mechanisms (loop detection, step limits)
- Multi-channel deployment (CLI, WhatsApp, custom gateways)

---

## 2. Architecture

### High-Level Design Pattern

Dexter implements an **autonomous agent loop** with the following flow:

```
User Query → System Prompt + Tools → LLM Reasoning
    ↓
Tool Planning & Execution → Self-Validation
    ↓
Context Management & Memory → Iteration Loop (max 10)
    ↓
Refined Answer with Data Backing
```

### Core Components Interaction

1. **Agent Loop** (`agent.ts`): Orchestrates the main agentic flow
2. **Tool Executor** (`tool-executor.ts`): Manages tool calls, approvals, execution events
3. **Scratchpad** (`scratchpad.ts`): Append-only JSONL log of all work (debugging, history)
4. **Token Counter** (`token-counter.ts`): Tracks LLM usage across iterations
5. **Run Context** (`run-context.ts`): Mutable state for a single agent run
6. **Prompts** (`prompts.ts`): Dynamic system prompt builder with skills/tools/SOUL injection

### Safety & Control Mechanisms

- **Max Iterations**: Default 10 to prevent runaway execution
- **Tool Approval Gate**: `write_file`, `edit_file` require user approval
- **Context Overflow Handling**: Graceful degradation with token counting
- **Loop Detection**: Scratchpad tracks query similarity to prevent retry loops
- **Tool Call Limits**: Per-tool rate limiting (default 3 calls per tool per query)

---

## 3. Tech Stack

### Core Runtime & Language
- **Bun**: Modern JavaScript runtime (replaces Node.js)
- **TypeScript 5.9.3**: Strict type safety
- **ESNext Module System**: Native ES modules

### AI/LLM Integration
- **@langchain/anthropic**: Claude API integration
- **@langchain/openai**: GPT model support
- **@langchain/google-genai**: Gemini models
- **@langchain/ollama**: Local model support
- **@langchain/core**: Base tools/messages infrastructure
- **langsmith**: LLM observability & debugging

### Data & Web Tools
- **@langchain/exa**: Web search integration
- **@langchain/tavily**: Enhanced web search
- **exa-js**: Direct search API
- **playwright**: Browser automation (v1.58.2)
- **better-sqlite3**: Persistent local database
- **linkedom**: Lightweight DOM parsing

### UI & I/O
- **@mariozechner/pi-tui**: Terminal UI framework
- **@mozilla/readability**: HTML content extraction
- **qrcode-terminal**: QR code generation (WhatsApp scanning)
- **@whiskeysockets/baileys**: WhatsApp bot framework (v7.0.0-rc.9)

### Data Processing
- **zod**: Runtime schema validation (v4.3.6)
- **gray-matter**: Frontmatter parsing (YAML/TOML in files)
- **diff**: Text diffing utilities
- **croner**: Cron scheduling

### Testing & Development
- **Jest**: Unit testing framework
- **ts-jest**: Jest + TypeScript integration
- **Babel**: JavaScript transpilation (ESM support)

---

## 4. Key Components

### Agent (`src/agent/agent.ts`)
**Responsibility**: Core agent loop orchestration
- Manages iteration flow (reasoning → tool execution → validation)
- Handles LLM calls via `callLlm()`
- Coordinates with `AgentToolExecutor` for tool invocation
- Tracks context overflow and applies recovery strategies
- Emits `AgentEvent` stream for consumers
- Supports configurable model, max iterations, approval callbacks

**Key Methods**:
- `async run(query)`: Execute agent on user query
- Private iteration management with overflow recovery
- Tool availability filtering per iteration

### Tool Executor (`src/agent/tool-executor.ts`)
**Responsibility**: Execute tool calls with approval gating
- Deduplicates skill invocations (once per query)
- Enforces approval for dangerous tools (`write_file`, `edit_file`)
- Emits granular lifecycle events (Start, Progress, End, Error)
- Tracks progress on long-running operations
- Returns standardized `ToolCallRecord` format

**Event Types**:
- `ToolStartEvent`: Tool invocation begins
- `ToolProgressEvent`: Mid-execution updates
- `ToolEndEvent`: Completed with result
- `ToolErrorEvent`: Failure with error message
- `ToolApprovalEvent`: Awaiting user approval
- `ToolDeniedEvent`: User rejected tool call
- `ToolLimitEvent`: Tool rate limit reached

### Scratchpad (`src/agent/scratchpad.ts`)
**Responsibility**: Append-only work log & loop detection
- **Format**: JSONL (newline-delimited JSON) for resilient appending
- **Storage**: `.dexter/scratchpad/` directory (query hash-based filenames)
- **Entries**:
  - `init`: Query start with system context
  - `thinking`: Agent reasoning/planning
  - `tool_result`: Tool execution with args & result
- **Features**:
  - Tool call counting with soft limits & warnings
  - Query similarity detection to guide LLM on potential loops
  - No blocking (warnings only) for graceful degradation

### Token Counter (`src/agent/token-counter.ts`)
**Responsibility**: Aggregate token usage tracking
- Accumulates input/output tokens across multiple LLM calls
- Provides total token count and tokens-per-second metric
- Returns undefined if no tokens tracked (cost-aware)

### Run Context (`src/agent/run-context.ts`)
**Responsibility**: Mutable state container for a single execution
- `query`: User input
- `scratchpad`: Append-only work log
- `tokenCounter`: Accumulated LLM usage
- `iteration`: Current loop count
- `startTime`: Execution begin timestamp

### Prompts (`src/agent/prompts.ts`)
**Responsibility**: Dynamic system prompt construction
- Builds date context via `getCurrentDate()`
- Loads optional SOUL.md (custom personality/behavior override)
- Injects tool descriptions via `buildToolDescriptions()`
- Injects available skills metadata
- Applies channel-specific formatting rules (CLI, WhatsApp, etc.)
- Constructs iteration prompts with scratchpad history

**Key Functions**:
- `buildSystemPrompt()`: Full system message
- `buildIterationPrompt()`: Per-iteration context
- `getCurrentDate()`: Formatted date string
- `loadSoulDocument()`: User override or bundled SOUL.md

---

## 5. Entry Points

### CLI Entry Point (`src/index.tsx`)
```typescript
#!/usr/bin/env bun
import { config } from 'dotenv';
import { runCli } from './cli.js';

config({ quiet: true });
await runCli();
```

**Flow**:
1. Load environment variables from `.env`
2. Invoke TUI-based CLI interface
3. User provides query → Agent processes → Results displayed

**Available Scripts**:
- `bun run src/index.tsx` or `npm start`: Run CLI directly
- `bun --watch run src/index.tsx` or `npm run dev`: Watch mode
- `tsx src/gateway/index.ts run`: Gateway mode (API server)
- `tsx src/gateway/index.ts login`: WhatsApp authentication

### CLI Implementation (`src/cli.ts`)
**Responsibility**: Interactive terminal UI for agent interaction
- **Framework**: `@mariozechner/pi-tui` for rich terminal rendering
- **Components**:
  - `IntroComponent`: Welcome screen
  - `ModelSelectionController`: Choose LLM provider/model
  - `ApiKeyInputComponent`: Credential entry with validation
  - `ChatLogComponent`: Display conversation history
  - `WorkingIndicatorComponent`: Loading animation
  - `ApprovalPromptComponent`: User approval for sensitive operations
  - `DebugPanelComponent`: Token usage & metrics display
- **Controllers**:
  - `AgentRunnerController`: Manages agent execution
  - `InputHistoryController`: Query history/autocomplete
  - `ModelSelectionController`: Provider/model selection
- **Theme**: Custom theme object for consistent styling

---

## 6. Data Flow

### Query → Response Flow

```
┌─────────────────────────────────────────────┐
│ 1. User Query (CLI Input)                   │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ 2. Environment & Model Setup                │
│    - Load .env credentials                  │
│    - Create LLM provider instance           │
│    - Build system prompt with tools/skills  │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ 3. Agent Initialization (agent.ts)          │
│    - Create RunContext                      │
│    - Initialize Scratchpad & TokenCounter   │
│    - Register available tools               │
└────────────────┬────────────────────────────┘
                 │
        ┌────────▼────────────────┐
        │ 4. Main Agent Loop      │
        │    (max iterations: 10) │
        └────────┬────────────────┘
                 │
     ┌───────────▼───────────┐
     │ Iteration N           │
     │ (repeat until done)   │
     └───────────┬───────────┘
                 │
    ┌────────────▼──────────────────┐
    │ 4a. Build Iteration Prompt     │
    │     - Include scratchpad       │
    │     - Add context limits       │
    │     - Channel-specific rules   │
    └────────────┬───────────────────┘
                 │
    ┌────────────▼──────────────────┐
    │ 4b. Call LLM                   │
    │     (Claude/GPT/Gemini)        │
    │     - Receive AIMessage        │
    │     - Validate tool_calls      │
    │     - Token counting           │
    └────────────┬───────────────────┘
                 │
    ┌────────────▼──────────────────┐
    │ 4c. Execute Tools             │
    │     - Extract tool calls       │
    │     - Apply approval gates     │
    │     - Run tool logic           │
    │     - Log results to scratchpad│
    │     - Emit progress events     │
    └────────────┬───────────────────┘
                 │
    ┌────────────▼──────────────────┐
    │ 4d. Process Results            │
    │     - Check for DoneEvent      │
    │     - Update context state     │
    │     - Prepare next iteration   │
    └────────────┬───────────────────┘
                 │
                 │ More work?
        ┌────────▴─────────┐
        │ No               │ Yes
        │                  │
┌───────▼──────┐  ┌────────▼──────────┐
│ 5. Finalize  │  │ Return to 4b      │
│              │  │ (next iteration)   │
└───────┬──────┘  └───────────────────┘
        │
┌───────▼──────────────────────────────┐
│ 6. Return Final Response              │
│    - Aggregate scratchpad            │
│    - Token usage summary             │
│    - Tool call records               │
│    - Display via CLI component       │
└───────────────────────────────────────┘
```

### Tool Execution Sub-flow

```
Tool Call (from LLM)
    ↓
[Require Approval?]
├─ write_file/edit_file → Request approval
│   ├─ User allows-once → Execute once
│   ├─ User allow-session → Execute + cache approval
│   └─ User deny → Stop agent turn, emit ToolDeniedEvent
└─ Other tools → Execute directly
    ↓
Execute tool with args
    ↓
Tool produces result (data or error)
    ↓
Record in scratchpad (JSONL append)
    ↓
Emit tool lifecycle event (End/Error)
    ↓
Include result in next LLM prompt
```

### Channel-Specific Data Flow

**CLI Channel**:
- Stripped markdown (no headers/italics)
- Compact tables with TUI rendering
- Direct tool result summaries

**WhatsApp Channel**:
- Truncated responses for SMS/chat readiness
- Emoji support
- Link previews via gateway

---

## 7. Getting Started Guide

### Prerequisites
- **Bun v1.0+**: [Download from bun.com](https://bun.com)
- **Node.js 18+**: For npm compatibility (fallback to npm instead of bun)
- **API Keys**: At least one LLM provider (OpenAI, Anthropic, Google, etc.)

### Installation

1. **Clone Repository**
```bash
git clone <dexter-repo>
cd dexter
```

2. **Install Dependencies**
```bash
bun install
# OR npm install
```

3. **Setup Environment**
```bash
cp .env.example .env
# Edit .env with your API keys:
# OPENAI_API_KEY=sk_...
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_API_KEY=...
# TAVILY_API_KEY=...
# EXA_API_KEY=...
```

### Running the Agent

**Basic CLI Usage**:
```bash
bun run src/index.tsx
# Or: npm start
```

**Watch Mode** (auto-reload on changes):
```bash
bun --watch run src/index.tsx
# Or: npm run dev
```

**Gateway Mode** (API server for WhatsApp/integrations):
```bash
tsx src/gateway/index.ts run
```

**WhatsApp Setup**:
```bash
tsx src/gateway/index.ts login
# Scan QR code with WhatsApp
```

### Typical Workflow

1. Start CLI: `bun run src/index.tsx`
2. Select LLM provider (OpenAI, Anthropic, etc.)
3. Enter API key (if not in .env)
4. Type financial research query:
   - "What's AAPL's revenue trend over 5 years?"
   - "Compare Tesla and Ford's operating margins"
   - "What are the risks in the semiconductor supply chain?"
5. Agent decomposes query → executes tools → validates → returns answer
6. Review scratchpad log in `.dexter/scratchpad/` for debugging

### Configuration

**Agent Behavior** (`AgentConfig`):
- `model`: LLM to use (default: 'gpt-5.4')
- `modelProvider`: Provider name ('openai', 'anthropic', etc.)
- `maxIterations`: Loop limit (default: 10)
- `channel`: Output format ('cli', 'whatsapp')
- `groupContext`: Group chat metadata (WhatsApp)

**Channel Profiles** (`src/agent/channels.ts`):
- **CLI**: Concise, professional tone; table-optimized
- **WhatsApp**: Brief, emoji-friendly; link previews

**Scratchpad Configuration** (`ScratchpadTS`):
- `maxCallsPerTool`: Per-tool rate limit (default: 3)
- `similarityThreshold`: Query clustering (default: 0.7)

### Testing

```bash
bun test                # Run all tests
bun test --watch       # Watch mode
npm run typecheck      # TypeScript validation
```

**Test Patterns** (via `jest.config.js`):
- Files: `**/__tests__/**/*.test.ts`
- ESM support via ts-jest
- Coverage collection for `src/agent/**`

### Debugging

**Scratchpad Logs**:
```bash
cat .dexter/scratchpad/<query-hash>.jsonl
```

**Token Usage**:
- CLI shows token count in debug panel
- `TokenCounter.getTokensPerSecond()` for performance
- `TokenUsage` type: `{ inputTokens, outputTokens, totalTokens }`

**LangSmith Integration**:
- Set `LANGSMITH_API_KEY` & `LANGSMITH_PROJECT` in .env
- View traces at app.smith.langchain.com

### Common Issues

**API Key Not Found**:
- Ensure `.env` contains `<PROVIDER>_API_KEY`
- Restart CLI if .env was modified

**Token Limit Exceeded**:
- Agent auto-reduces context window
- Max 2 retries before graceful degradation
- Check token usage in debug panel

**Tool Execution Fails**:
- Review scratchpad JSONL for error details
- Check tool arguments format matches schema
- Validate web connectivity for search tools

**Infinite Loop Warning**:
- Agent tracks query similarity
- After 3 similar attempts, suggests manual review
- Check scratchpad for repeated patterns

---

## Summary

**Dexter** is a production-ready financial research agent that combines sophisticated prompt engineering, real-time data access, and safety mechanisms into a unified autonomous system. Its modular architecture supports multiple deployment channels (CLI, WhatsApp, custom APIs), making it suitable for both individual researchers and enterprise integrations.

**Key Strengths**:
- Intelligent decomposition of complex queries
- Autonomous execution with built-in safeguards
- Multi-model support (OpenAI, Anthropic, Google, Ollama)
- Rich terminal UI with real-time progress
- Extensive logging for debugging and iteration

**Next Steps for Developers**:
- Explore `src/tools/registry.ts` for available tools
- Review `src/skills/` for extensible skill system
- Customize `src/agent/channels.ts` for new platforms
- Add custom tools via tool registration interface
