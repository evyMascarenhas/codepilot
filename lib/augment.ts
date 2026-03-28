// Augment Code integration
// Uses Auggie SDK for codebase analysis and chat

import path from "node:path";
import { fileURLToPath } from "node:url";

// Ensure auggie CLI is on PATH for the SDK — use __dirname-relative path
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const binDir = path.join(projectRoot, "node_modules", ".bin");
if (!process.env.PATH?.includes(binDir)) {
  process.env.PATH = `${binDir}:${process.env.PATH}`;
}

async function getAuggieSDK() {
  const { Auggie } = await import("@augmentcode/auggie-sdk");
  return Auggie;
}

export class AugmentClient {
  get isConfigured(): boolean {
    return true;
  }

  async analyzeCodebase(files: { path: string; content: string }[]): Promise<{
    overview: string;
    fileAnalyses: { path: string; summary: string }[];
  }> {
    const Auggie = await getAuggieSDK();
    const client = await Auggie.create();

    try {
      // Build a concise file summary to keep prompt manageable
      const fileList = files
        .slice(0, 15)
        .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 2000)}`)
        .join("\n\n");

      const prompt =
        "Analyze these source files and write a markdown report with: " +
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
      await client.close();
    }
  }
}

// Chat helper — use Auggie SDK for answering questions about analyzed repos
export async function chatWithAuggie(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const Auggie = await getAuggieSDK();
  const client = await Auggie.create();

  try {
    const prompt =
      systemPrompt + "\n\n---\n\nUser question: " + userMessage;
    const response = await client.prompt(prompt);
    return typeof response === "string"
      ? response
      : JSON.stringify(response);
  } finally {
    await client.close();
  }
}
