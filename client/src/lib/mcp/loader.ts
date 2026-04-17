import { experimental_createMCPClient, type Tool } from "ai";
import { createServiceClient } from "../supabase-server";
import { readSecret } from "../llm/vault";
import { getTemplate } from "./registry";

// A live MCP session with its exposed tools (namespaced so multiple servers don't collide)
// plus a `close()` that MUST be awaited after the chat completes to free sockets.
export type LoadedMcp = {
  tools: Record<string, Tool>;
  close: () => Promise<void>;
};

type IntegrationRow = {
  id: string;
  template_id: string;
  vault_secret_id: string;
  config: Record<string, unknown>;
};

const EMPTY: LoadedMcp = { tools: {}, close: async () => {} };

export async function loadMcpClientsForAgent(agentId: string): Promise<LoadedMcp> {
  const sb = createServiceClient();

  const { data: agent } = await sb
    .from("agents")
    .select("user_id, mcp_integration_ids")
    .eq("id", agentId)
    .maybeSingle();
  if (!agent) return EMPTY;

  const ids = (agent.mcp_integration_ids ?? []) as string[];
  if (!ids.length) return EMPTY;

  const { data: rows } = await sb
    .from("mcp_integrations")
    .select("id, template_id, vault_secret_id, config")
    .eq("user_id", agent.user_id)
    .eq("is_active", true)
    .in("id", ids);

  const clients: Array<{ close: () => Promise<void> }> = [];
  const tools: Record<string, Tool> = {};

  await Promise.all(
    ((rows ?? []) as IntegrationRow[]).map(async (row) => {
      const template = getTemplate(row.template_id);
      if (!template) return;

      try {
        const secretJson = await readSecret(row.vault_secret_id);
        const secrets = (secretJson ? JSON.parse(secretJson) : {}) as Record<
          string,
          string
        >;
        const cfg = {
          ...(row.config as Record<string, string>),
          ...secrets,
        };
        const url = String(cfg.url ?? "");
        if (!url) return;
        const headers = template.buildHeaders?.(cfg) ?? {};

        const client = await createClient(template.transport, url, headers);
        const serverTools = await client.tools();
        const prefix = row.id.slice(0, 8);
        for (const [name, tool] of Object.entries(serverTools)) {
          tools[`${prefix}__${name}`] = tool as Tool;
        }
        clients.push(client);
      } catch (err) {
        console.error(
          `[mcp] integration ${row.id} (${row.template_id}) failed to init:`,
          err
        );
        // Soft fail — other MCPs on this agent still work.
      }
    })
  );

  return {
    tools,
    close: async () => {
      await Promise.all(
        clients.map((c) =>
          c.close().catch((err) => {
            console.warn("[mcp] client close failed", err);
          })
        )
      );
    },
  };
}

async function createClient(
  transport: "sse" | "http",
  url: string,
  headers: Record<string, string>
) {
  if (transport === "sse") {
    return experimental_createMCPClient({
      transport: { type: "sse", url, headers },
    });
  }
  // Streamable HTTP — requires @modelcontextprotocol/sdk (separate package).
  // Lazy-imported so SSE still works even if the SDK is missing in the environment.
  const { StreamableHTTPClientTransport } = await import(
    "@modelcontextprotocol/sdk/client/streamableHttp.js"
  );
  const httpTransport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers },
  });
  return experimental_createMCPClient({ transport: httpTransport });
}
