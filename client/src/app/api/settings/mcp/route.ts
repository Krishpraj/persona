import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { storeSecret, maskKey } from "@/lib/llm/vault";
import {
  MCP_TEMPLATES,
  getTemplate,
  splitConfigBySecret,
  validateRequired,
} from "@/lib/mcp/registry";

type IntegrationRow = {
  id: string;
  template_id: string;
  label: string;
  config: Record<string, unknown>;
  secret_preview: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function enrich(row: IntegrationRow) {
  const template = getTemplate(row.template_id);
  return {
    ...row,
    template: template
      ? {
          id: template.id,
          name: template.name,
          description: template.description,
          transport: template.transport,
        }
      : null,
  };
}

export async function GET() {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { data, error } = await supabase
    .from("mcp_integrations")
    .select(
      "id, template_id, label, config, secret_preview, is_active, created_at, updated_at"
    )
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    integrations: ((data ?? []) as IntegrationRow[]).map(enrich),
    templates: MCP_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      transport: t.transport,
      configSchema: t.configSchema,
    })),
  });
}

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { user } = ctx;

  const body = await req.json().catch(() => ({}));
  const templateId = String(body?.template_id ?? "");
  const label = String(body?.label ?? "").trim();
  const rawConfig = (body?.config ?? {}) as Record<string, unknown>;

  const template = getTemplate(templateId);
  if (!template)
    return NextResponse.json({ error: "invalid template_id" }, { status: 400 });
  if (!label)
    return NextResponse.json({ error: "label required" }, { status: 400 });

  const { secrets, config } = splitConfigBySecret(template, rawConfig);
  const missing = validateRequired(template, secrets, config);
  if (missing) return NextResponse.json({ error: missing }, { status: 400 });

  // Always store a vault secret (even when empty) so cleanup trigger is uniform.
  const bundle = JSON.stringify(secrets);
  const secretName = `mcp:${user.id}:${templateId}:${crypto.randomUUID()}`;
  const vault_secret_id = await storeSecret(
    bundle,
    secretName,
    `MCP integration (${template.name}) for user ${user.id}`
  );

  // Preview the first non-empty secret value, or fall back to "no-auth".
  const firstSecret = Object.values(secrets)[0];
  const secret_preview = firstSecret ? maskKey(firstSecret) : "no auth";

  const service = createServiceClient();
  const { data, error } = await service
    .from("mcp_integrations")
    .insert({
      user_id: user.id,
      template_id: templateId,
      label,
      vault_secret_id,
      config,
      secret_preview,
      is_active: true,
    })
    .select(
      "id, template_id, label, config, secret_preview, is_active, created_at, updated_at"
    )
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    { integration: enrich(data as IntegrationRow) },
    { status: 201 }
  );
}
