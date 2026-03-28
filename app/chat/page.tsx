"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Thread } from "@/components/assistant-ui/thread";

function ChatContent() {
  const searchParams = useSearchParams();
  const owner = searchParams.get("owner") ?? "";
  const repo = searchParams.get("repo") ?? "";

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

        {/* Welcome message area + chat */}
        <div className="flex-1 overflow-hidden">
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
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
