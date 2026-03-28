"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Thread } from "@/components/assistant-ui/thread";

function ChatContent() {
  const searchParams = useSearchParams();
  const owner = searchParams.get("owner") ?? "";
  const repo = searchParams.get("repo") ?? "";
  const [welcomeMsg, setWelcomeMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!owner || !repo) {
      setLoading(false);
      return;
    }
    fetch(`/api/welcome?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.welcome) setWelcomeMsg(data.welcome);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [owner, repo]);

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
      body: {
        repoOwner: owner,
        repoName: repo,
      },
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex flex-col h-dvh">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b bg-white">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">CP</span>
              </div>
              <span className="font-semibold">CodePilot</span>
            </a>
            <span className="text-muted-foreground">/</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">
                {owner}/{repo}
              </span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                ✓ Analyzed
              </span>
            </div>
          </div>
          <a
            href={`https://github.com/${owner}/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View on GitHub →
          </a>
        </header>

        {/* Welcome analysis + chat */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full" />
              <span className="ml-3 text-muted-foreground text-sm">Loading analysis...</span>
            </div>
          ) : welcomeMsg ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="overflow-y-auto px-4 py-6 border-b bg-slate-50/50" style={{ maxHeight: "45vh" }}>
                <div className="max-w-3xl mx-auto prose prose-sm prose-slate">
                  <WelcomeMarkdown content={welcomeMsg} />
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <Thread />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          )}
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

function WelcomeMarkdown({ content }: { content: string }) {
  // Simple markdown-to-HTML for the welcome message
  const html = content
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-300 pl-3 italic text-muted-foreground my-2">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="my-4 border-slate-200" />')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-xs">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n{2,}/g, '<div class="mb-3"></div>')
    .replace(/\n/g, "<br />");

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
