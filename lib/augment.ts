// Augment Code SDK integration
// Falls back to generating analysis with OpenAI if Augment is unavailable

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export class AugmentClient {
  private configured: boolean;

  constructor() {
    this.configured = !!process.env.AUGMENT_API_TOKEN;
  }

  get isConfigured(): boolean {
    return this.configured;
  }

  async analyzeCodebase(files: { path: string; content: string }[]): Promise<{
    overview: string;
    fileAnalyses: { path: string; summary: string }[];
  }> {
    if (this.configured) {
      return this.analyzeWithAugment(files);
    }
    return this.analyzeWithOpenAI(files);
  }

  private async analyzeWithAugment(
    files: { path: string; content: string }[],
  ): Promise<{
    overview: string;
    fileAnalyses: { path: string; summary: string }[];
  }> {
    try {
      // Use Augment's auggie-sdk for codebase analysis
      const { Auggie } = await import("@augmentcode/auggie-sdk");
      const client = await Auggie.create({
        apiKey: process.env.AUGMENT_API_TOKEN,
      });

      const fileList = files
        .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 3000)}`)
        .join("\n\n");

      const overview = await client.prompt(
        `Analyze this codebase and provide:\n1. A high-level architecture overview\n2. Key design patterns used\n3. Main entry points and data flow\n4. Technology stack details\n5. How to get started as a new developer\n\nFiles:\n${fileList}`,
      );

      const fileAnalyses = files.map((f) => ({
        path: f.path,
        summary: `File in the project: ${f.path}`,
      }));

      await client.close();

      return {
        overview: typeof overview === "string" ? overview : JSON.stringify(overview),
        fileAnalyses,
      };
    } catch (e) {
      console.warn("Augment SDK failed, falling back to OpenAI:", e);
      return this.analyzeWithOpenAI(files);
    }
  }

  private async analyzeWithOpenAI(
    files: { path: string; content: string }[],
  ): Promise<{
    overview: string;
    fileAnalyses: { path: string; summary: string }[];
  }> {
    // Build a compact representation of the codebase
    const fileList = files
      .map(
        (f) =>
          `--- ${f.path} ---\n${f.content.slice(0, 2000)}${f.content.length > 2000 ? "\n[truncated]" : ""}`,
      )
      .join("\n\n");

    const { text: overview } = await generateText({
      model: openai("gpt-4.1-mini"),
      system: `You are a senior software engineer analyzing a codebase. Provide a comprehensive but concise analysis. Use markdown formatting.`,
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

    // Generate per-file summaries
    const fileAnalyses = await Promise.all(
      files.slice(0, 15).map(async (f) => {
        try {
          const { text } = await generateText({
            model: openai("gpt-4.1-nano"),
            prompt: `In 1-2 sentences, describe what this file does:\n\nFile: ${f.path}\n\n${f.content.slice(0, 1500)}`,
          });
          return { path: f.path, summary: text };
        } catch {
          return {
            path: f.path,
            summary: `Source file at ${f.path}`,
          };
        }
      }),
    );

    return { overview, fileAnalyses };
  }
}
