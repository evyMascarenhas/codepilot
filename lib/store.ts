// In-memory store for analyzed repo data (hackathon MVP)
// In production, this would be Redis or a database

export interface AnalyzedRepo {
  owner: string;
  repo: string;
  description: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  treeOverview: string;
  fileAnalyses: { path: string; summary: string; content: string }[];
  overallAnalysis: string;
  sensoOrgId: string | null;
  analyzedAt: number;
}

const store = new Map<string, AnalyzedRepo>();

export function getRepoKey(owner: string, repo: string): string {
  return `${owner}/${repo}`.toLowerCase();
}

export function storeAnalyzedRepo(data: AnalyzedRepo): void {
  store.set(getRepoKey(data.owner, data.repo), data);
}

export function getAnalyzedRepo(
  owner: string,
  repo: string,
): AnalyzedRepo | undefined {
  return store.get(getRepoKey(owner, repo));
}

export function buildContextPrompt(data: AnalyzedRepo): string {
  const parts: string[] = [];

  parts.push(`# Repository: ${data.owner}/${data.repo}`);
  if (data.description) parts.push(`**Description:** ${data.description}`);
  if (data.language) parts.push(`**Primary Language:** ${data.language}`);
  if (data.topics.length) parts.push(`**Topics:** ${data.topics.join(", ")}`);
  parts.push("");
  parts.push("## Project Structure Overview");
  parts.push(data.treeOverview);
  parts.push("");
  parts.push("## Codebase Analysis");
  parts.push(data.overallAnalysis);
  parts.push("");

  if (data.fileAnalyses.length > 0) {
    parts.push("## Key File Details");
    for (const f of data.fileAnalyses.slice(0, 20)) {
      parts.push(`### ${f.path}`);
      parts.push(f.summary);
      parts.push("");
    }
  }

  return parts.join("\n");
}
