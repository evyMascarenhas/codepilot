// Senso.ai integration — index and query knowledge
const SENSO_API = "https://api.sensos.io";

export interface KnowledgeChunk {
  title: string;
  content: string;
  metadata?: Record<string, string>;
}

export class SensoClient {
  private apiKey: string;
  private orgId: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.SENSO_API_KEY ?? "";
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async createOrganization(name: string): Promise<string> {
    if (!this.isConfigured) return "local-fallback";
    try {
      const res = await fetch(`${SENSO_API}/v1/orgs`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        console.warn(`Senso org creation failed: ${res.status}`);
        return "local-fallback";
      }
      const data = await res.json();
      this.orgId = data.org_id ?? data.id;
      return this.orgId!;
    } catch (e) {
      console.warn("Senso API unavailable, using local fallback", e);
      return "local-fallback";
    }
  }

  async indexKnowledge(
    orgId: string,
    chunks: KnowledgeChunk[],
  ): Promise<boolean> {
    if (!this.isConfigured || orgId === "local-fallback") return false;
    try {
      const res = await fetch(`${SENSO_API}/v1/orgs/${orgId}/documents`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          documents: chunks.map((c) => ({
            title: c.title,
            content: c.content,
            metadata: c.metadata,
          })),
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn("Senso indexing failed", e);
      return false;
    }
  }

  async queryKnowledge(
    orgId: string,
    query: string,
  ): Promise<string[]> {
    if (!this.isConfigured || orgId === "local-fallback") return [];
    try {
      const res = await fetch(`${SENSO_API}/v1/orgs/${orgId}/search`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ query, top_k: 5 }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results ?? []).map(
        (r: { content: string }) => r.content,
      );
    } catch {
      return [];
    }
  }
}
