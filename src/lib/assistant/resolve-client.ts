import type { AssistantClient } from "@/lib/assistant/context";

export type ClientResolveResult =
  | { ok: true; client: AssistantClient }
  | { ok: false; reason: "missing" }
  | { ok: false; reason: "ambiguous"; candidates: AssistantClient[] }
  | { ok: false; reason: "not_found" };

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function findClientsByQuery(
  clients: AssistantClient[],
  query: string,
  limit = 8,
): AssistantClient[] {
  const q = norm(query);
  if (!q) return [];

  const scored = clients
    .map((c) => {
      const n = norm(c.name);
      let score = 0;
      if (n === q) score = 100;
      else if (n.startsWith(q)) score = 80;
      else if (n.includes(q)) score = 60;
      else if (q.split(/\s+/).every((w) => n.includes(w))) score = 40;
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.c);
}

export function resolveClient(
  clients: AssistantClient[],
  clientQuery: string | undefined,
): ClientResolveResult {
  const q = clientQuery?.trim();
  if (!q) return { ok: false, reason: "missing" };

  const matches = findClientsByQuery(clients, q, 10);
  if (matches.length === 0) return { ok: false, reason: "not_found" };
  if (matches.length === 1) return { ok: true, client: matches[0] };

  const exact = matches.filter((c) => norm(c.name) === norm(q));
  if (exact.length === 1) return { ok: true, client: exact[0] };

  return { ok: false, reason: "ambiguous", candidates: matches.slice(0, 5) };
}
