export type ReportsResolvedFilters = {
  from: string;
  to: string;
  clientId: string | null;
  granularity: "month" | "week";
};

export function buildReportsQueryString(f: ReportsResolvedFilters): string {
  const p = new URLSearchParams();
  p.set("from", f.from);
  p.set("to", f.to);
  if (f.clientId) p.set("client_id", f.clientId);
  p.set("granularity", f.granularity);
  return p.toString();
}
