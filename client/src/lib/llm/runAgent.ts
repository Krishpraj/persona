import { generateText, type CoreMessage } from "ai";
import { createServiceClient } from "../supabase-server";
import { getModelFor } from "./provider";

type AgentRow = {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  system_prompt: string | null;
};

type NodeRow = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

type ChatTurn = { role: "user" | "assistant"; content: string };

async function loadAgentContext(agentId: string) {
  const sb = createServiceClient();
  const { data: agent, error: agentErr } = await sb
    .from("agents")
    .select("id, user_id, name, role, system_prompt")
    .eq("id", agentId)
    .single();
  if (agentErr || !agent) throw new Error("agent not found");
  const { data: nodes, error: nodesErr } = await sb
    .from("agent_nodes")
    .select("id, type, data")
    .eq("agent_id", agentId);
  if (nodesErr) throw new Error(nodesErr.message);
  return { agent: agent as AgentRow, nodes: (nodes ?? []) as NodeRow[] };
}

function serializeNode(n: NodeRow): string | null {
  const label = (n.data?.["label"] as string) || n.type;
  if (n.type === "image") {
    const caption = (n.data?.["caption"] as string) || "";
    const alt = (n.data?.["alt"] as string) || "";
    const url = (n.data?.["imageUrl"] as string) || "";
    if (!url && !caption && !alt) return null;
    const lines = [`# ${label} (image)`];
    if (caption) lines.push(caption);
    if (alt && alt !== caption) lines.push(`alt: ${alt}`);
    if (url) lines.push(`url: ${url}`);
    return lines.join("\n");
  }
  if (n.type === "link") {
    const url = (n.data?.["url"] as string) || "";
    const description = (n.data?.["description"] as string) || "";
    if (!url && !description) return null;
    const lines = [`# ${label} (link)`];
    if (description) lines.push(description);
    if (url) lines.push(`url: ${url}`);
    return lines.join("\n");
  }
  // text / knowledge / unknown -> treat as text content
  const content =
    (n.data?.["content"] as string) || (n.data?.["text"] as string) || "";
  if (!content) return null;
  return `# ${label}\n${content}`;
}

function buildSystemPrompt(agent: AgentRow, nodes: NodeRow[]): string {
  const parts: string[] = [];
  parts.push(
    agent.system_prompt?.trim() ||
      `You are ${agent.name}${agent.role ? `, acting as a ${agent.role}` : ""}. Answer questions using the knowledge below.`
  );
  const serialized = nodes
    .map(serializeNode)
    .filter((s): s is string => !!s);
  if (serialized.length > 0) {
    parts.push("\n\n--- Knowledge ---");
    for (const chunk of serialized) parts.push(`\n${chunk}`);
  }
  return parts.join("");
}

export async function runAgentChat(
  agentId: string,
  history: ChatTurn[],
  userMessage: string
): Promise<string> {
  const { agent, nodes } = await loadAgentContext(agentId);
  const model = await getModelFor(agent.user_id);
  const messages: CoreMessage[] = [
    { role: "system", content: buildSystemPrompt(agent, nodes) },
    ...history.map((h): CoreMessage => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage },
  ];
  const { text } = await generateText({ model, messages });
  return text;
}
