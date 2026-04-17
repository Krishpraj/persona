import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { user, supabase } = ctx;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const key of ["label", "base_url", "model_default"]) {
    if (key in (body ?? {})) patch[key] = body[key] ?? null;
  }
  const wantActive = body?.is_active === true;

  const service = createServiceClient();

  if (wantActive) {
    // demote any currently active credential for this user (except the target row)
    const { error: demoteErr } = await service
      .from("llm_credentials")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true)
      .neq("id", id);
    if (demoteErr)
      return NextResponse.json({ error: demoteErr.message }, { status: 500 });
    patch.is_active = true;
  } else if (body?.is_active === false) {
    patch.is_active = false;
  }

  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("llm_credentials")
    .update(patch)
    .eq("id", id)
    .select(
      "id, provider, label, key_preview, base_url, model_default, is_active, created_at, updated_at"
    )
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ credential: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;
  const { error } = await supabase.from("llm_credentials").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
