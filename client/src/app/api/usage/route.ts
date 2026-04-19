import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

type EventRow = {
  id: string;
  kind: "agent_run" | "mcp_call";
  tool_name: string | null;
  agent_id: string | null;
  project_id: string | null;
  model: string | null;
  status: "ok" | "error";
  duration_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  error: string | null;
  created_at: string;
};

type AgentRow = { id: string; name: string };

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * DAY_MS).toISOString();

  const [eventsRes, agentsRes] = await Promise.all([
    supabase
      .from("usage_events")
      .select(
        "id, kind, tool_name, agent_id, project_id, model, status, duration_ms, input_tokens, output_tokens, error, created_at"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("agents").select("id, name"),
  ]);

  if (eventsRes.error)
    return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });

  const events = (eventsRes.data ?? []) as EventRow[];
  const agents = (agentsRes.data ?? []) as AgentRow[];
  const agentName = new Map(agents.map((a) => [a.id, a.name]));

  // Daily bucket keyed by YYYY-MM-DD, filled with zeros so the chart is continuous.
  const bucketMap = new Map<string, { runs: number; calls: number; errors: number }>();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    bucketMap.set(d.toISOString().slice(0, 10), { runs: 0, calls: 0, errors: 0 });
  }
  for (const e of events) {
    const key = e.created_at.slice(0, 10);
    const b = bucketMap.get(key);
    if (!b) continue;
    if (e.kind === "agent_run") b.runs += 1;
    else b.calls += 1;
    if (e.status === "error") b.errors += 1;
  }
  const series = Array.from(bucketMap.entries()).map(([day, v]) => ({ day, ...v }));

  // Aggregates
  const totals = {
    runs: events.filter((e) => e.kind === "agent_run").length,
    calls: events.filter((e) => e.kind === "mcp_call").length,
    errors: events.filter((e) => e.status === "error").length,
    inputTokens: events.reduce((n, e) => n + (e.input_tokens ?? 0), 0),
    outputTokens: events.reduce((n, e) => n + (e.output_tokens ?? 0), 0),
  };

  const toolCounts = new Map<string, { count: number; errors: number }>();
  for (const e of events) {
    if (e.kind !== "mcp_call" || !e.tool_name) continue;
    const cur = toolCounts.get(e.tool_name) ?? { count: 0, errors: 0 };
    cur.count += 1;
    if (e.status === "error") cur.errors += 1;
    toolCounts.set(e.tool_name, cur);
  }
  const topTools = Array.from(toolCounts.entries())
    .map(([tool, v]) => ({ tool, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const agentCounts = new Map<string, { runs: number; calls: number }>();
  for (const e of events) {
    if (!e.agent_id) continue;
    const cur = agentCounts.get(e.agent_id) ?? { runs: 0, calls: 0 };
    if (e.kind === "agent_run") cur.runs += 1;
    else cur.calls += 1;
    agentCounts.set(e.agent_id, cur);
  }
  const topAgents = Array.from(agentCounts.entries())
    .map(([id, v]) => ({
      id,
      name: agentName.get(id) ?? "(deleted)",
      ...v,
    }))
    .sort((a, b) => b.runs + b.calls - (a.runs + a.calls))
    .slice(0, 8);

  const recent = events.slice(0, 50).map((e) => ({
    id: e.id,
    kind: e.kind,
    tool: e.tool_name,
    agentId: e.agent_id,
    agentName: e.agent_id ? agentName.get(e.agent_id) ?? null : null,
    model: e.model,
    status: e.status,
    durationMs: e.duration_ms,
    inputTokens: e.input_tokens,
    outputTokens: e.output_tokens,
    error: e.error,
    createdAt: e.created_at,
  }));

  return NextResponse.json({
    days,
    totals,
    series,
    topTools,
    topAgents,
    recent,
  });
}
