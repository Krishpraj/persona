// MCP template registry — curated list of server types a user can connect from /settings.
// Each template declares its transport and the config fields we collect.
// Fields flagged `secret: true` are bundled into a single Vault-encrypted JSON secret.

export type McpTransport = "sse" | "http";

export type McpConfigField = {
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
  secret: boolean;
  type?: "text" | "url" | "password";
};

export type McpServerTemplate = {
  id: string;
  name: string;
  description: string;
  transport: McpTransport;
  configSchema: McpConfigField[];
  buildHeaders?: (cfg: Record<string, string>) => Record<string, string>;
};

const bearerHeaders = (c: Record<string, string>): Record<string, string> =>
  c.authToken ? { Authorization: `Bearer ${c.authToken}` } : {};

export const MCP_TEMPLATES: McpServerTemplate[] = [
  {
    id: "custom-sse",
    name: "Custom SSE Server",
    description:
      "Any MCP server that speaks Server-Sent Events. Paste the URL and (optionally) a bearer token.",
    transport: "sse",
    configSchema: [
      {
        key: "url",
        label: "Server URL",
        placeholder: "https://mcp.example.com/sse",
        required: true,
        secret: false,
        type: "url",
      },
      {
        key: "authToken",
        label: "Bearer Token",
        placeholder: "optional",
        required: false,
        secret: true,
        type: "password",
      },
    ],
    buildHeaders: bearerHeaders,
  },
  {
    id: "custom-http",
    name: "Custom HTTP (Streamable)",
    description:
      "Any Streamable-HTTP MCP server. Paste the endpoint and (optionally) a bearer token.",
    transport: "http",
    configSchema: [
      {
        key: "url",
        label: "Server URL",
        placeholder: "https://mcp.example.com/mcp",
        required: true,
        secret: false,
        type: "url",
      },
      {
        key: "authToken",
        label: "Bearer Token",
        placeholder: "optional",
        required: false,
        secret: true,
        type: "password",
      },
    ],
    buildHeaders: bearerHeaders,
  },
];

export function getTemplate(id: string): McpServerTemplate | undefined {
  return MCP_TEMPLATES.find((t) => t.id === id);
}

export function splitConfigBySecret(
  template: McpServerTemplate,
  input: Record<string, unknown>
): { secrets: Record<string, string>; config: Record<string, string> } {
  const secrets: Record<string, string> = {};
  const config: Record<string, string> = {};
  for (const field of template.configSchema) {
    const raw = input[field.key];
    if (raw === undefined || raw === null) continue;
    const value = String(raw).trim();
    if (!value) continue;
    if (field.secret) secrets[field.key] = value;
    else config[field.key] = value;
  }
  return { secrets, config };
}

export function validateRequired(
  template: McpServerTemplate,
  secrets: Record<string, string>,
  config: Record<string, string>
): string | null {
  for (const field of template.configSchema) {
    if (!field.required) continue;
    const present = field.secret ? !!secrets[field.key] : !!config[field.key];
    if (!present) return `${field.label} is required`;
  }
  return null;
}
