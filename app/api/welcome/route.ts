import { getAnalyzedRepo } from "@/lib/store";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") ?? "";
  const repo = req.nextUrl.searchParams.get("repo") ?? "";

  if (!owner || !repo) {
    return Response.json({ error: "Missing owner or repo" }, { status: 400 });
  }

  const data = getAnalyzedRepo(owner, repo);
  if (!data) {
    return Response.json({ error: "Repo not analyzed" }, { status: 404 });
  }

  const meta = [
    data.language ? `**Language:** ${data.language}` : "",
    data.stars ? `⭐ ${data.stars.toLocaleString()} stars` : "",
    data.topics.length ? `Topics: ${data.topics.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const welcome = [
    `## 👋 Welcome! Here's what I found about **${owner}/${repo}**\n`,
    data.description ? `> ${data.description}\n\n` : "\n",
    meta ? `${meta}\n\n` : "",
    "---\n\n",
    data.overallAnalysis,
    "\n\n---\n\n",
    "💬 **What would you like to know?** Ask me anything about this codebase — architecture, setup, specific files, how to contribute, or where to find specific functionality.",
  ].join("");

  return Response.json({ welcome });
}
