import { generateText, type CoreMessage } from "ai";
import { createServiceClient } from "../supabase-server";
import { getModelFor } from "./provider";
import { loadMcpToolsForAgent } from "../mcp/loader";

type AgentRow = {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  role: string | null;
  system_prompt: string | null;
  skill_ids?: string[];
};

type SkillRow = {
  id: string;
  name: string;
  description: string;
  instructions: string;
};

type ProjectRow = {
  id: string;
  name: string;
};

type DataSourceRow = {
  id: string;
  kind: "doc" | "nodegraph" | "csv";
  name: string;
  data: Record<string, unknown>;
};

type ChatTurn = { role: "user" | "assistant"; content: string };

async function loadAgentContext(agentId: string) {
  const sb = createServiceClient();
  const { data: agent, error: agentErr } = await sb
    .from("agents")
    .select("id, user_id, project_id, name, role, system_prompt, skill_ids")
    .eq("id", agentId)
    .single();
  if (agentErr || !agent) throw new Error("agent not found");
  const agentRow = agent as AgentRow;

  const { data: project } = await sb
    .from("projects")
    .select("id, name")
    .eq("id", agentRow.project_id)
    .maybeSingle();

  const { data: sources } = await sb
    .from("data_sources")
    .select("id, kind, name, data")
    .eq("project_id", agentRow.project_id)
    .eq("user_id", agentRow.user_id)
    .order("position", { ascending: true });

  const skillIds = (agentRow.skill_ids ?? []) as string[];
  let skills: SkillRow[] = [];
  if (skillIds.length > 0) {
    const { data: skillRows } = await sb
      .from("skills")
      .select("id, name, description, instructions")
      .eq("user_id", agentRow.user_id)
      .in("id", skillIds);
    skills = (skillRows ?? []) as SkillRow[];
  }

  return {
    agent: agentRow,
    project: (project ?? { id: agentRow.project_id, name: "" }) as ProjectRow,
    sources: (sources ?? []) as DataSourceRow[],
    skills,
  };
}

function summarizeSources(sources: DataSourceRow[]): string {
  if (sources.length === 0) return "(none yet)";
  const docs = sources.filter((s) => s.kind === "doc");
  const graphs = sources.filter((s) => s.kind === "nodegraph");
  const csvs = sources.filter((s) => s.kind === "csv");
  const pdfs = sources.filter((s) => s.kind === "pdf");
  const parts: string[] = [];
  if (docs.length) parts.push(`Docs: ${docs.map((d) => d.name).join(", ")}`);
  if (graphs.length)
    parts.push(`Node graphs: ${graphs.map((g) => g.name).join(", ")}`);
  if (csvs.length) {
    const csvStrs = csvs.map((c) => {
      const cols = ((c.data["columns"] as string[]) ?? []).length;
      const inline = c.data["rows"] as unknown[] | undefined;
      const rowLabel = Array.isArray(inline) ? `${inline.length} rows` : "stored rows";
      return `${c.name} (${cols} cols, ${rowLabel})`;
    });
    parts.push(`CSVs: ${csvStrs.join(", ")}`);
  }
  if (pdfs.length) {
    const pdfStrs = pdfs.map((p) => {
      const pc = (p.data["page_count"] as number) ?? 0;
      return `${p.name} (${pc} pages)`;
    });
    parts.push(`PDFs: ${pdfStrs.join(", ")}`);
  }
  return parts.join(". ");
}

function buildSystemPrompt(
  agent: AgentRow,
  project: ProjectRow,
  sources: DataSourceRow[],
  skills: SkillRow[]
): string {
  const base =
    agent.system_prompt?.trim() ||
    `You are ${agent.name}${agent.role ? `, acting as a ${agent.role}` : ""}. Answer questions using the project's data sources.`;
  const parts: string[] = [base];
  parts.push(
    `\n\n--- Project: ${project.name || "(untitled)"} ---\n${summarizeSources(sources)}`
  );
  parts.push(
    "\n\n--- Tools ---\nYou have access to the project-knowledge MCP:\n" +
      "- `projectknowledge__list_sources` — discover docs, node graphs, CSVs and PDFs in this project.\n" +
      "- `projectknowledge__search` — full-text search across docs, node graphs and PDF text.\n" +
      "- `projectknowledge__csv_query` — structured query over a CSV data source (pass the data_source_id from list_sources).\n" +
      "- `projectknowledge__get_image` — fetch an image referenced by a doc block or nodegraph node.\n" +
      "- `projectknowledge__get_pdf` — fetch a PDF's URL, metadata, and optionally extracted text (pass a page number for a single page).\n" +
      "Prefer calling tools over guessing. Cite data source names when relevant."
  );
  if (skills.length > 0) {
    const index = skills
      .map(
        (s) =>
          `- **${s.name}**${s.description ? ` — ${s.description}` : ""}`
      )
      .join("\n");
    const bodies = skills
      .map(
        (s) =>
          `### ${s.name}\n${s.description ? `_${s.description}_\n\n` : ""}${s.instructions.trim()}`
      )
      .join("\n\n---\n\n");
    parts.push(
      `\n\n--- Skills ---\nApply these skills when the situation matches their description. They compound with the base instructions above.\n\nIndex:\n${index}\n\n${bodies}`
    );
  }
  return parts.join("");
}

export async function runAgentChat(
  agentId: string,
  history: ChatTurn[],
  userMessage: string
): Promise<string> {
  const { agent, project, sources, skills } = await loadAgentContext(agentId);
  const model = await getModelFor(agent.user_id);
  const messages: CoreMessage[] = [
    { role: "system", content: buildSystemPrompt(agent, project, sources, skills) },
    ...history.map((h): CoreMessage => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage },
  ];
  const mcp = await loadMcpToolsForAgent(agentId);
  const startedAt = Date.now();
  let runStatus: "ok" | "error" = "ok";
  let runError: string | undefined;
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let toolCallEvents: Array<{ tool: string; status: "ok" | "error"; error?: string }> = [];

  try {
    const hasTools = Object.keys(mcp.tools).length > 0;
    const result = await generateText({
      model,
      messages,
      ...(hasTools ? { tools: mcp.tools, maxSteps: 5 } : {}),
    });
    inputTokens = result.usage?.promptTokens;
    outputTokens = result.usage?.completionTokens;
    toolCallEvents = extractToolCalls(result);
    return result.text;
  } catch (err) {
    runStatus = "error";
    runError = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    await mcp.close();
    // Fire-and-forget: never let telemetry failures break a chat.
    void recordUsage({
      userId: agent.user_id,
      projectId: agent.project_id,
      agentId: agent.id,
      modelId: typeof model === "object" && model && "modelId" in model
        ? String((model as { modelId: unknown }).modelId)
        : undefined,
      durationMs: Date.now() - startedAt,
      status: runStatus,
      error: runError,
      inputTokens,
      outputTokens,
      toolCalls: toolCallEvents,
    });
  }
}

type GenResult = Awaited<ReturnType<typeof generateText>>;

function extractToolCalls(
  result: GenResult
): Array<{ tool: string; status: "ok" | "error"; error?: string }> {
  const events: Array<{ tool: string; status: "ok" | "error"; error?: string }> = [];
  const steps = (result as unknown as { steps?: unknown[] }).steps ?? [];
  for (const step of steps) {
    const s = step as {
      toolCalls?: Array<{ toolName?: string }>;
      toolResults?: Array<{ toolName?: string; isError?: boolean; result?: unknown }>;
    };
    const results = s.toolResults ?? [];
    const calls = s.toolCalls ?? [];
    // Prefer toolResults (has error signal); fall back to toolCalls.
    const source = results.length ? results : calls;
    for (const entry of source) {
      const name = entry.toolName;
      if (!name) continue;
      const isError =
        (entry as { isError?: boolean }).isError === true ||
        (typeof (entry as { result?: { isError?: boolean } }).result === "object" &&
          (entry as { result?: { isError?: boolean } }).result?.isError === true);
      events.push({
        tool: name,
        status: isError ? "error" : "ok",
        error: isError
          ? (() => {
              const r = (entry as { result?: unknown }).result;
              if (typeof r === "string") return r;
              try {
                return JSON.stringify(r).slice(0, 500);
              } catch {
                return undefined;
              }
            })()
          : undefined,
      });
    }
  }
  return events;
}

async function recordUsage(params: {
  userId: string;
  projectId: string;
  agentId: string;
  modelId?: string;
  durationMs: number;
  status: "ok" | "error";
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  toolCalls: Array<{ tool: string; status: "ok" | "error"; error?: string }>;
}) {
  try {
    const sb = createServiceClient();
    const rows: Array<Record<string, unknown>> = [
      {
        user_id: params.userId,
        project_id: params.projectId,
        agent_id: params.agentId,
        kind: "agent_run",
        model: params.modelId ?? null,
        status: params.status,
        duration_ms: params.durationMs,
        input_tokens: params.inputTokens ?? null,
        output_tokens: params.outputTokens ?? null,
        error: params.error ? params.error.slice(0, 1000) : null,
      },
      ...params.toolCalls.map((tc) => ({
        user_id: params.userId,
        project_id: params.projectId,
        agent_id: params.agentId,
        kind: "mcp_call",
        tool_name: tc.tool,
        model: params.modelId ?? null,
        status: tc.status,
        error: tc.error ? tc.error.slice(0, 1000) : null,
      })),
    ];
    await sb.from("usage_events").insert(rows);
  } catch (err) {
    console.warn("[usage] failed to record run", err);
  }
}
