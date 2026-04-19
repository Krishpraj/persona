"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Loading } from "@/components/Loading";
import { cn } from "@/lib/utils";

type Series = { day: string; runs: number; calls: number; errors: number };
type ToolRow = { tool: string; count: number; errors: number };
type AgentRow = { id: string; name: string; runs: number; calls: number };
type RecentRow = {
  id: string;
  kind: "agent_run" | "mcp_call";
  tool: string | null;
  agentId: string | null;
  agentName: string | null;
  model: string | null;
  status: "ok" | "error";
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  error: string | null;
  createdAt: string;
};
type UsagePayload = {
  days: number;
  totals: {
    runs: number;
    calls: number;
    errors: number;
    inputTokens: number;
    outputTokens: number;
  };
  series: Series[];
  topTools: ToolRow[];
  topAgents: AgentRow[];
  recent: RecentRow[];
};

const RANGES: Array<{ key: string; days: number; label: string }> = [
  { key: "7d", days: 7, label: "7d" },
  { key: "30d", days: 30, label: "30d" },
  { key: "90d", days: 90, label: "90d" },
];

export default function UsagePage() {
  const [data, setData] = useState<UsagePayload | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/usage?days=${days}`, { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) {
          setError(body?.error || "Failed to load usage");
          setData(null);
        } else {
          setError(null);
          setData(body as UsagePayload);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-8 py-12">
        <header className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[2.5rem] font-medium leading-[1.05] tracking-[-0.02em]">
              Usage
            </h1>
            <p className="mt-3 text-[15px] text-muted-foreground">
              Agent runs and MCP tool calls across your workspace.
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-0 border border-border/70 bg-card/30">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setDays(r.days)}
                className={cn(
                  "h-9 px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                  days === r.days
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <Loading label="loading usage" />
        ) : error ? (
          <div className="border border-destructive/40 bg-destructive/10 px-5 py-4 text-[14px] text-destructive">
            {error}
          </div>
        ) : !data ? null : (
          <UsageView data={data} />
        )}
      </div>
    </div>
  );
}

function UsageView({ data }: { data: UsagePayload }) {
  const stats = [
    { label: "Agent runs", value: data.totals.runs },
    { label: "MCP calls", value: data.totals.calls },
    { label: "Errors", value: data.totals.errors, tone: "danger" as const },
    {
      label: "Tokens",
      value: data.totals.inputTokens + data.totals.outputTokens,
    },
  ];

  return (
    <>
      <section className="mb-10 grid grid-cols-2 gap-px border border-border/70 bg-border/60 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 bg-card/30 px-5 py-5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
              {s.label}
            </span>
            <span
              className={cn(
                "text-[28px] font-medium tracking-[-0.03em]",
                s.tone === "danger" && s.value > 0 && "text-destructive"
              )}
            >
              {formatNumber(s.value)}
            </span>
          </div>
        ))}
      </section>

      <section className="mb-10 border border-border/70 bg-card/30">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Activity · last {data.days} days
          </h2>
          <LegendKey />
        </div>
        <div className="h-[260px] px-2 pb-3 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.series}
              margin={{ top: 6, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gRuns" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-foreground)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-foreground)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
                <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.55}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.04}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                stroke="var(--color-muted-foreground)"
                tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                tickFormatter={formatDayTick}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                stroke="var(--color-muted-foreground)"
                tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="calls"
                stroke="var(--color-primary)"
                strokeWidth={1.6}
                fill="url(#gCalls)"
              />
              <Area
                type="monotone"
                dataKey="runs"
                stroke="var(--color-foreground)"
                strokeWidth={1.6}
                fill="url(#gRuns)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Top MCP tools">
          {data.topTools.length === 0 ? (
            <EmptyNote>No tool calls yet.</EmptyNote>
          ) : (
            <div className="h-[260px] px-2 pb-3 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topTools}
                  layout="vertical"
                  margin={{ top: 4, right: 18, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    stroke="var(--color-muted-foreground)"
                    tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="tool"
                    width={140}
                    stroke="var(--color-muted-foreground)"
                    tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(name: string) =>
                      name.length > 18 ? `…${name.slice(-17)}` : name
                    }
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="var(--color-primary)"
                    radius={[0, 2, 2, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Top agents">
          {data.topAgents.length === 0 ? (
            <EmptyNote>No runs recorded yet.</EmptyNote>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.topAgents.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-4 px-5 py-3 text-[13.5px]"
                >
                  <Link
                    href={`/agent/${a.id}`}
                    className="min-w-0 flex-1 truncate font-medium tracking-tight hover:underline"
                  >
                    {a.name}
                  </Link>
                  <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {a.runs} runs · {a.calls} calls
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <Panel title={`Recent activity · ${data.recent.length}`}>
        {data.recent.length === 0 ? (
          <EmptyNote>
            Nothing yet. Chat with an agent and events will appear here.
          </EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border/60 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-5 py-2.5 font-normal">When</th>
                  <th className="px-5 py-2.5 font-normal">Kind</th>
                  <th className="px-5 py-2.5 font-normal">Target</th>
                  <th className="px-5 py-2.5 font-normal">Agent</th>
                  <th className="px-5 py-2.5 font-normal">Status</th>
                  <th className="px-5 py-2.5 text-right font-normal">Tokens</th>
                  <th className="px-5 py-2.5 text-right font-normal">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/40 last:border-b-0"
                    title={r.error ?? undefined}
                  >
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {formatWhen(r.createdAt)}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
                          r.kind === "agent_run"
                            ? "border-foreground/25 text-foreground"
                            : "border-primary/60 bg-primary/15 text-foreground"
                        )}
                      >
                        {r.kind === "agent_run" ? "run" : "mcp"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      {r.kind === "mcp_call" ? (
                        <span className="font-mono text-[12px]">{r.tool}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {r.model ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {r.agentId ? (
                        <Link
                          href={`/agent/${r.agentId}`}
                          className="truncate tracking-tight hover:underline"
                        >
                          {r.agentName ?? "agent"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={cn(
                          "font-mono text-[11px] uppercase tracking-[0.18em]",
                          r.status === "ok"
                            ? "text-muted-foreground"
                            : "text-destructive"
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-[12px] text-muted-foreground">
                      {formatTokens(r.inputTokens, r.outputTokens)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-[12px] text-muted-foreground">
                      {formatDuration(r.durationMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border/70 bg-card/30">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">
      {children}
    </div>
  );
}

function LegendKey() {
  return (
    <div className="flex items-center gap-4 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-[2px] w-4 bg-foreground" />
        runs
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-[2px] w-4 bg-primary" />
        mcp
      </span>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border/70 bg-card/95 px-3 py-2 text-[12px] shadow-sm backdrop-blur">
      <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        {typeof label === "string" && label.length === 10
          ? formatDayTick(label)
          : label}
      </div>
      {payload.map((p) => (
        <div
          key={p.dataKey ?? p.name}
          className="flex items-center gap-2 font-mono text-[11.5px]"
        >
          <span
            className="inline-block h-2 w-2"
            style={{ background: p.color }}
            aria-hidden
          />
          <span className="text-muted-foreground">{p.name ?? p.dataKey}</span>
          <span className="ml-auto tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function formatDayTick(day: string) {
  const d = new Date(day + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(inTok: number | null, outTok: number | null) {
  if (inTok == null && outTok == null) return "—";
  return `${inTok ?? 0} → ${outTok ?? 0}`;
}
