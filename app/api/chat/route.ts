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

  // Extract the last user message
  const lastUserMessage = messages
    .filter((m) => m.role === "user")
    .pop();
  const userText = lastUserMessage
    ? lastUserMessage.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ")
    : "";

  // Build repo context from analyzed data
  let repoContext = "";
  let repoLabel = "an unknown repository";
  if (repoOwner && repoName) {
    repoLabel = `${repoOwner}/${repoName}`;
    const repoData = getAnalyzedRepo(repoOwner, repoName);
    if (repoData) {
      repoContext = buildContextPrompt(repoData);

      // Also query Senso for additional context if available
      if (repoData.sensoOrgId) {
        const senso = new SensoClient();
        if (userText) {
          const results = await senso.queryKnowledge(
            repoData.sensoOrgId,
            userText,
          );
          if (results.length > 0) {
            repoContext += `\n\n## Additional Context from Senso Knowledge Base\n${results.join("\n\n")}`;
          }
        }
      }
    } else {
      repoContext = `(No analyzed data found for ${repoLabel}. The repository may need to be re-analyzed.)`;
    }
  }

  // Build a single self-contained prompt that includes all context inline
  // This prevents Auggie from exploring its local filesystem
  const fullPrompt = [
    `IMPORTANT: You are answering questions about the GitHub repository "${repoLabel}".`,
    `Do NOT read any local files or explore any local filesystem.`,
    `ONLY use the repository context provided below to answer the user's question.`,
    `If the context does not contain enough information, say so — do not guess or look elsewhere.`,
    ``,
    `Be specific, reference actual file paths and code patterns from the context.`,
    `Use markdown formatting for clarity.`,
    ``,
    `=== REPOSITORY CONTEXT FOR ${repoLabel.toUpperCase()} ===`,
    repoContext,
    `=== END REPOSITORY CONTEXT ===`,
    ``,
    system ? system : "",
    ``,
    `User question about ${repoLabel}: ${userText}`,
  ]
    .filter(Boolean)
    .join("\n");

  // Use Auggie — pass entire prompt as user message so it doesn't act as coding agent
  const response = await chatWithAuggie(fullPrompt);

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      // Must send text-start before any text-delta chunks
      writer.write({
        type: "text-start",
        id: "auggie-msg",
      });
      const chunkSize = 20;
      for (let i = 0; i < response.length; i += chunkSize) {
        writer.write({
          type: "text-delta",
          delta: response.slice(i, i + chunkSize),
          id: "auggie-msg",
        });
      }
      writer.write({
        type: "text-end",
        id: "auggie-msg",
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
