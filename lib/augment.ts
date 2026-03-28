// Augment Code integration
// Uses Auggie SDK for codebase analysis and chat, falls back to OpenAI

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import path from "node:path";

// Ensure auggie CLI is on PATH for the SDK
const binDir = path.resolve(process.cwd(), "node_modules/.bin");
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
    try {
      return await this.analyzeWithAuggie(files);
    } catch (e) {
      console.warn("Auggie SDK failed, falling back to OpenAI:", e);
      return this.analyzeWithOpenAI(files);
    }
  }

  private async analyzeWithAuggie(
    files: { path: string; content: string }[],
  ): Promise<{
    overview: string;
    fileAnalyses: { path: string; summary: string }[];
  }> {
    const Auggie = await getAuggieSDK();
    const client = await Auggie.create();

    const fileList = files
      .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 2500)}`)
      .join("\n\n");

    const overview = await client.prompt(
      `Analyze this codebase and provide a comprehensive markdown report covering:
1. **Project Overview**: What this project does
2. **Architecture**: High-level architecture, key patterns
3. **Tech Stack**: Languages, frameworks, libraries
4. **Key Components**: Main modules and their responsibilities
5. **Entry Points**: Where the app starts
6. **Data Flow**: How data moves through the system
7. **Getting Started**: How a new developer should approach this codebase

Here are the key files:

${fileList}`,
    );

    await client.close();

    const fileAnalyses = files.slice(0, 15).map((f) => ({
      path: f.path,
      summary: `Source file analyzed by Augment Code: ${f.path}`,
    }));

    return {
      overview: typeof overview === "string" ? overview : JSON.stringify(overview),
      fileAnalyses,
    };
  }

  private async analyzeWithOpenAI(
    files: { path: string; content: string }[],
  ): Promise<{
    overview: string;
    fileAnalyses: { path: string; summary: string }[];
  }> {
    const fileList = files
      .map(
        (f) =>
          `--- ${f.path} ---\n${f.content.slice(0, 2000)}${f.content.length > 2000 ? "\n[truncated]" : ""}`,
      )
      .join("\n\n");

    const { text: overview } = await generateText({
      model: openai("gpt-4.1-mini"),
      system:
        "You are a senior software engineer analyzing a codebase. Provide a comprehensive but concise analysis. Use markdown formatting.",
      prompt: `Analyze this codebase and provide:

1. **Project Overview**: What this project does, its purpose
2. **Architecture**: High-level architecture, key patterns, design decisions
3. **Tech Stack**: Languages, frameworks, libraries, tools
4. **Key Components**: Main modules/services and their responsibilities
5. **Entry Points**: Where the app starts, main routes/handlers
6. **Data Flow**: How data moves through the system
7. **Getting Started**: How a new developer should approach this codebase

Files:
${fileList}`,
    });

    const fileAnalyses = await Promise.all(
      files.slice(0, 15).map(async (f) => {
        try {
          const { text } = await generateText({
            model: openai("gpt-4.1-nano"),
            prompt: `In 1-2 sentences, describe what this file does:\n\nFile: ${f.path}\n\n${f.content.slice(0, 1500)}`,
          });
          return { path: f.path, summary: text };
        } catch {
          return { path: f.path, summary: `Source file at ${f.path}` };
        }
      }),
    );

    return { overview, fileAnalyses };
  }
}

// Chat helper — use Auggie SDK for answering questions about analyzed repos
export async function chatWithAuggie(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const Auggie = await getAuggieSDK();
  const client = await Auggie.create();

  const response = await client.prompt(
    `${systemPrompt}\n\n---\n\nUser question: ${userMessage}`,
  );

  await client.close();
  return typeof response === "string" ? response : JSON.stringify(response);
}
