import { NextResponse } from "next/server";
import {
  parseGitHubUrl,
  fetchRepoInfo,
  fetchRepoTree,
  fetchFileContent,
  selectKeyFiles,
} from "@/lib/github";
import { SensoClient } from "@/lib/senso";
import { AugmentClient } from "@/lib/augment";
import { storeAnalyzedRepo, type AnalyzedRepo } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const { repoUrl, ghToken } = await req.json();
    if (!repoUrl) {
      return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
    }

    // Use provided token for this request (for private repos)
    if (ghToken) {
      process.env._CODEPILOT_GH_TOKEN = ghToken;
    }

    const { owner, repo } = parseGitHubUrl(repoUrl);

    // Step 1: Fetch repo info
    const repoInfo = await fetchRepoInfo(owner, repo);

    // Step 2: Fetch file tree
    const tree = await fetchRepoTree(owner, repo, repoInfo.defaultBranch);

    // Step 3: Select key files to analyze
    const keyFilePaths = selectKeyFiles(tree);

    // Build tree overview
    const treeOverview = buildTreeOverview(tree);

    // Step 4: Fetch content of key files
    const filesWithContent = await Promise.all(
      keyFilePaths.map(async (path) => ({
        path,
        content: await fetchFileContent(
          owner,
          repo,
          path,
          repoInfo.defaultBranch,
        ),
      })),
    );

    // Step 5: Analyze with Augment Code (or OpenAI fallback)
    const augment = new AugmentClient();
    const analysis = await augment.analyzeCodebase(filesWithContent);

    // Step 6: Index into Senso.ai
    const senso = new SensoClient();
    let sensoOrgId: string | null = null;
    if (senso.isConfigured) {
      sensoOrgId = await senso.createOrganization(`codepilot-${owner}-${repo}`);
      await senso.indexKnowledge(sensoOrgId, [
        {
          title: `${owner}/${repo} - Overview`,
          content: analysis.overview,
          metadata: { type: "overview", repo: `${owner}/${repo}` },
        },
        ...analysis.fileAnalyses.map((f) => ({
          title: `${owner}/${repo} - ${f.path}`,
          content: f.summary,
          metadata: { type: "file", path: f.path, repo: `${owner}/${repo}` },
        })),
      ]);
    }

    // Step 7: Store in memory for chat context
    const analyzedData: AnalyzedRepo = {
      owner,
      repo,
      description: repoInfo.description,
      language: repoInfo.language,
      stars: repoInfo.stars,
      topics: repoInfo.topics,
      treeOverview,
      fileAnalyses: analysis.fileAnalyses.map((f) => ({
        ...f,
        content:
          filesWithContent.find((fc) => fc.path === f.path)?.content ?? "",
      })),
      overallAnalysis: analysis.overview,
      sensoOrgId,
      analyzedAt: Date.now(),
    };

    storeAnalyzedRepo(analyzedData);

    return NextResponse.json({
      success: true,
      owner,
      repo,
      description: repoInfo.description,
      language: repoInfo.language,
      stars: repoInfo.stars,
      filesAnalyzed: keyFilePaths.length,
      totalFiles: tree.filter((t) => t.type === "blob").length,
      sensoIndexed: senso.isConfigured,
      augmentUsed: augment.isConfigured,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    console.error("Analysis error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildTreeOverview(tree: { path: string; type: string }[]): string {
  const dirs = new Set<string>();
  let fileCount = 0;

  for (const item of tree) {
    if (item.type === "tree") {
      // Only include top-level dirs
      const depth = item.path.split("/").length;
      if (depth <= 2) dirs.add(item.path);
    } else {
      fileCount++;
    }
  }

  const sortedDirs = [...dirs].sort();
  let overview = `Total files: ${fileCount}\n\nDirectory structure:\n`;
  overview += sortedDirs.map((d) => `  ${d}/`).join("\n");
  return overview;
}
