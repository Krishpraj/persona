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

function buildSystemPrompt(agent: AgentRow, nodes: NodeRow[]): string {
  const parts: string[] = [];
  parts.push(
    agent.system_prompt?.trim() ||
      `You are ${agent.name}${agent.role ? `, acting as a ${agent.role}` : ""}. Answer questions using the knowledge below.`
  );
  if (nodes.length > 0) {
    parts.push("\n\n--- Knowledge ---");
    for (const n of nodes) {
      const label = (n.data?.["label"] as string) || n.type;
      const content =
        (n.data?.["content"] as string) ||
        (n.data?.["text"] as string) ||
        JSON.stringify(n.data);
      if (content && content !== "{}") {
        parts.push(`\n# ${label}\n${content}`);
      }
    }
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
