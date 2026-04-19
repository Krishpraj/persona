// MCP template registry. First-party "builtin" templates run in-process against
// the project's own data; "external" templates would open network MCP sessions
// (not yet shipped). Every project gets exactly one `project-knowledge` row
// auto-created by a DB trigger.

export type McpKind = "builtin" | "external";
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
  kind: McpKind;
  transport?: McpTransport;
  configSchema: McpConfigField[];
  buildHeaders?: (cfg: Record<string, string>) => Record<string, string>;
};

export const MCP_TEMPLATES: McpServerTemplate[] = [
  {
    id: "project-knowledge",
    name: "Project Knowledge",
    description:
      "Query the docs, node graphs and CSVs attached to this project. Auto-attached to every agent in the project.",
    kind: "builtin",
    configSchema: [],
  },
  {
    id: "custom-http",
    name: "Custom MCP (Streamable HTTP)",
    description:
      "Connect any MCP server that speaks the streamable HTTP transport. Tools it exposes become available to agents you opt in.",
    kind: "external",
    transport: "http",
    configSchema: [
      {
        key: "url",
        label: "Server URL",
        placeholder: "https://example.com/mcp",
        required: true,
        secret: false,
        type: "url",
      },
      {
        key: "token",
        label: "Bearer token",
        placeholder: "optional",
        required: false,
        secret: true,
        type: "password",
      },
    ],
    buildHeaders: (cfg) =>
      cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {},
  },
  {
    id: "custom-sse",
    name: "Custom MCP (SSE)",
    description:
      "Connect any MCP server that speaks the legacy SSE transport. Tools it exposes become available to agents you opt in.",
    kind: "external",
    transport: "sse",
    configSchema: [
      {
        key: "url",
        label: "Server URL",
        placeholder: "https://example.com/sse",
        required: true,
        secret: false,
        type: "url",
      },
      {
        key: "token",
        label: "Bearer token",
        placeholder: "optional",
        required: false,
        secret: true,
        type: "password",
      },
    ],
    buildHeaders: (cfg) =>
      cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {},
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
