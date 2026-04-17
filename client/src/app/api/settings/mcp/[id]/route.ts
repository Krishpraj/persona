import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body?.label === "string") patch.label = body.label.trim();
  if (typeof body?.is_active === "boolean") patch.is_active = body.is_active;

  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("mcp_integrations")
    .update(patch)
    .eq("id", id)
    .select(
      "id, template_id, label, config, secret_preview, is_active, created_at, updated_at"
    )
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ integration: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;

  // Vault secret is removed by the cleanup trigger (see migration).
  // Agents referencing this ID via mcp_integration_ids keep stale entries — the
  // runtime loader soft-skips unknown IDs, so no extra cleanup is needed.
  const { error } = await supabase.from("mcp_integrations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
