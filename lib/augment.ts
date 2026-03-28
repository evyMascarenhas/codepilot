// Augment Code integration
// Uses Auggie SDK for codebase analysis and chat

import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";

// Ensure auggie CLI is on PATH for the SDK — use __dirname-relative path
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const binDir = path.join(projectRoot, "node_modules", ".bin");
if (!process.env.PATH?.includes(binDir)) {
  process.env.PATH = `${binDir}:${process.env.PATH}`;
}

// For deployment: write ~/.augment/session.json from env var if it doesn't exist
const augmentDir = path.join(homedir(), ".augment");
const sessionPath = path.join(augmentDir, "session.json");
if (!existsSync(sessionPath) && process.env.AUGMENT_SESSION_JSON) {
  mkdirSync(augmentDir, { recursive: true });
  writeFileSync(sessionPath, process.env.AUGMENT_SESSION_JSON, "utf-8");
  console.log("[augment] Wrote session.json from AUGMENT_SESSION_JSON env var");
}

// Create an isolated workspace so Auggie doesn't index the app's own source
import { tmpdir } from "node:os";
const auggieWorkspace = path.join(tmpdir(), "codepilot-auggie-workspace");
if (!existsSync(auggieWorkspace)) {
  mkdirSync(auggieWorkspace, { recursive: true });
  // Create a minimal .git so auggie treats it as a project
  mkdirSync(path.join(auggieWorkspace, ".git"), { recursive: true });
  writeFileSync(
    path.join(auggieWorkspace, ".git", "HEAD"),
    "ref: refs/heads/main\n",
  );
}

async function getAuggieSDK() {
  const { Auggie } = await import("@augmentcode/auggie-sdk");
  return Auggie;
}

// Run Auggie from the isolated workspace to prevent local file indexing
async function createAuggieClient() {
  const Auggie = await getAuggieSDK();
  const originalCwd = process.cwd();
  process.chdir(auggieWorkspace);
  try {
    const client = await Auggie.create();
    return { client, restore: () => process.chdir(originalCwd) };
  } catch (e) {
    process.chdir(originalCwd);
    throw e;
  }
}

export class AugmentClient {
  get isConfigured(): boolean {
    return true;
  }

  async analyzeCodebase(files: { path: string; content: string }[]): Promise<{
    overview: string;
    fileAnalyses: { path: string; summary: string }[];
  }> {
    const { client, restore } = await createAuggieClient();

    try {
      const fileList = files
        .slice(0, 15)
        .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 2000)}`)
        .join("\n\n");

      const prompt =
        "You are a code analysis tool. Do NOT read any local files or use any tools. " +
        "ONLY analyze the source files provided below and write a markdown report with: " +
        "1) Project Overview, 2) Architecture, 3) Tech Stack, " +
        "4) Key Components, 5) Entry Points, 6) Data Flow, " +
        "7) Getting Started guide.\n\n" +
        fileList;

      const overview = await client.prompt(prompt);

      const fileAnalyses = files.slice(0, 15).map((f) => ({
        path: f.path,
        summary: `Analyzed by Augment Code: ${f.path}`,
      }));

      return {
        overview:
          typeof overview === "string"
            ? overview
            : JSON.stringify(overview),
        fileAnalyses,
      };
    } finally {
      restore();
      await client.close();
    }
  }
}

// Chat helper — use Auggie SDK for answering questions about analyzed repos
export async function chatWithAuggie(
  prompt: string,
): Promise<string> {
  const { client, restore } = await createAuggieClient();

  try {
    const response = await client.prompt(prompt);
    return typeof response === "string"
      ? response
      : JSON.stringify(response);
  } finally {
    restore();
    await client.close();
  }
}
