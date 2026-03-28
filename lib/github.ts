// GitHub API helpers — fetch repo tree and file contents
const GITHUB_API = "https://api.github.com";

export interface RepoFile {
  path: string;
  type: "blob" | "tree";
  size?: number;
  content?: string;
}

export interface RepoInfo {
  owner: string;
  repo: string;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  stars: number;
  topics: string[];
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
  );
  if (!match) throw new Error("Invalid GitHub URL");
  return { owner: match[1], repo: match[2] };
}

export async function fetchRepoInfo(
  owner: string,
  repo: string,
): Promise<RepoInfo> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: ghHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch repo info: ${res.status}`);
  const data = await res.json();
  return {
    owner,
    repo,
    description: data.description,
    defaultBranch: data.default_branch,
    language: data.language,
    stars: data.stargazers_count,
    topics: data.topics ?? [],
  };
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string,
): Promise<RepoFile[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: ghHeaders() },
  );
  if (!res.ok) throw new Error(`Failed to fetch repo tree: ${res.status}`);
  const data = await res.json();
  return (data.tree ?? []).map((t: { path: string; type: string; size?: number }) => ({
    path: t.path,
    type: t.type as "blob" | "tree",
    size: t.size,
  }));
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<string> {
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
    { headers: ghHeaders() },
  );
  if (!res.ok) return `[Failed to fetch: ${res.status}]`;
  return res.text();
}

const KEY_FILE_PATTERNS = [
  /^readme\.md$/i,
  /^package\.json$/,
  /^tsconfig\.json$/,
  /^pyproject\.toml$/,
  /^cargo\.toml$/,
  /^go\.mod$/,
  /^pom\.xml$/,
  /^gemfile$/i,
  /^dockerfile$/i,
  /^docker-compose\.ya?ml$/i,
  /^\.env\.example$/,
  /^requirements\.txt$/,
  /^setup\.py$/,
  /^makefile$/i,
  /^contributing\.md$/i,
  /^architecture\.md$/i,
];

const KEY_DIR_ENTRY_PATTERNS = [
  /^src\/index\./,
  /^src\/main\./,
  /^src\/app\./,
  /^app\/page\./,
  /^app\/layout\./,
  /^pages\/index\./,
  /^lib\//,
  /^src\/lib\//,
  /^src\/routes\//,
  /^api\//,
  /^src\/api\//,
  /^cmd\//,
  /^internal\//,
];

export function selectKeyFiles(tree: RepoFile[], maxFiles = 30): string[] {
  const candidates: string[] = [];

  for (const f of tree) {
    if (f.type !== "blob") continue;
    if (f.size && f.size > 50000) continue; // skip very large files

    const isKeyFile = KEY_FILE_PATTERNS.some((p) => p.test(f.path));
    const isKeyEntry = KEY_DIR_ENTRY_PATTERNS.some((p) => p.test(f.path));

    if (isKeyFile || isKeyEntry) {
      candidates.push(f.path);
    }
  }

  // If we have room, add more source files from common dirs
  if (candidates.length < maxFiles) {
    const srcFiles = tree
      .filter(
        (f) =>
          f.type === "blob" &&
          /\.(ts|tsx|js|jsx|py|go|rs|java|rb)$/.test(f.path) &&
          !candidates.includes(f.path) &&
          (!f.size || f.size < 30000) &&
          !f.path.includes("node_modules") &&
          !f.path.includes("vendor") &&
          !f.path.includes("dist/") &&
          !f.path.includes(".min."),
      )
      .slice(0, maxFiles - candidates.length);

    candidates.push(...srcFiles.map((f) => f.path));
  }

  return candidates.slice(0, maxFiles);
}

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CodePilot-Hackathon",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}
