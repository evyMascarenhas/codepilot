import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { getAnalyzedRepo, buildContextPrompt } from "@/lib/store";
import { SensoClient } from "@/lib/senso";
import { chatWithAuggie } from "@/lib/augment";

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
    repoOwner,
    repoName,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: unknown }>;
    repoOwner?: string;
    repoName?: string;
  } = await req.json();

  // Build system prompt with repo context
  let systemPrompt = `You are CodePilot, an expert AI assistant that helps developers understand codebases. You have deep knowledge of the repository that has been analyzed. 

Be specific, reference actual file paths and code patterns from the analysis. When answering:
- Reference specific files and their purposes
- Explain architecture decisions
- Suggest where to look for specific functionality
- Help with onboarding, setup, and contribution
- Use markdown formatting for clarity`;

  if (repoOwner && repoName) {
    const repoData = getAnalyzedRepo(repoOwner, repoName);
    if (repoData) {
      const context = buildContextPrompt(repoData);

      // Also query Senso for additional context if available
      let sensoContext = "";
      if (repoData.sensoOrgId) {
        const senso = new SensoClient();
        const lastUserMessage = messages
          .filter((m) => m.role === "user")
          .pop();
        if (lastUserMessage) {
          const msgText = lastUserMessage.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join(" ");
          const results = await senso.queryKnowledge(
            repoData.sensoOrgId,
            msgText,
          );
          if (results.length > 0) {
            sensoContext = `\n\n## Additional Context from Senso Knowledge Base\n${results.join("\n\n")}`;
          }
        }
      }

      systemPrompt += `\n\n---\n\nHere is the analyzed repository context:\n\n${context}${sensoContext}`;
    }
  }

  if (system) {
    systemPrompt = `${systemPrompt}\n\n${system}`;
  }

  // Extract the last user message for Auggie
  const lastUserMessage = messages
    .filter((m) => m.role === "user")
    .pop();
  const userText = lastUserMessage
    ? lastUserMessage.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ")
    : "";

  // Use Auggie as primary LLM for chat
  const response = await chatWithAuggie(systemPrompt, userText);

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const chunkSize = 20;
      for (let i = 0; i < response.length; i += chunkSize) {
        writer.write({
          type: "text-delta",
          delta: response.slice(i, i + chunkSize),
          id: "auggie-msg",
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
