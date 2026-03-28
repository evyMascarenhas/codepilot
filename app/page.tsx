"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) return;
    setLoading(true);
    setError("");
    setProgress("Fetching repository information...");

    try {
      setProgress("Analyzing codebase with AI...");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setProgress("Analysis complete! Opening chat...");
      router.push(`/chat?owner=${data.owner}&repo=${data.repo}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CP</span>
          </div>
          <span className="font-semibold text-lg">CodePilot</span>
        </div>
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span>Built with assistant-ui · Augment Code · Senso.ai · DigitalOcean</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            AI-Powered Codebase Onboarding
          </div>

          <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-gray-900 via-blue-800 to-blue-600 bg-clip-text text-transparent">
            Understand any codebase
            <br />
            in minutes, not days
          </h1>

          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            Paste a GitHub repo URL and CodePilot autonomously analyzes the
            architecture, patterns, and code — then lets you chat with it.
          </p>

          {/* Input */}
          <div className="flex gap-3 max-w-xl mx-auto">
            <input
              type="text"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base disabled:opacity-50"
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !repoUrl.trim()}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="opacity-25"
                    />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      className="opacity-75"
                    />
                  </svg>
                  Analyzing...
                </>
              ) : (
                "Analyze →"
              )}
            </button>
          </div>

          {/* Progress */}
          {loading && progress && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              {progress}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg inline-block">
              {error}
            </div>
          )}

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-4 mt-16 max-w-2xl mx-auto">
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm text-left">
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="font-medium text-sm mb-1">Fully Autonomous</h3>
              <p className="text-xs text-muted-foreground">
                Paste a URL — the agent does everything automatically
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm text-left">
              <div className="text-2xl mb-2">🧠</div>
              <h3 className="font-medium text-sm mb-1">Deep Analysis</h3>
              <p className="text-xs text-muted-foreground">
                Architecture, patterns, dependencies, and entry points
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm text-left">
              <div className="text-2xl mb-2">💬</div>
              <h3 className="font-medium text-sm mb-1">Chat Interface</h3>
              <p className="text-xs text-muted-foreground">
                Ask anything about the codebase in natural language
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
        Multimodal Frontier Hackathon 2026 · Powered by Augment Code, Senso.ai, assistant-ui & DigitalOcean
      </footer>
    </div>
  );
}
