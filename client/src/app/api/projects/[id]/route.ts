import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, description, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: agents, error: agentsErr } = await supabase
    .from("agents")
    .select("id, name, role, description, is_published, public_slug, updated_at")
    .eq("project_id", id)
    .order("updated_at", { ascending: false });
  if (agentsErr)
    return NextResponse.json({ error: agentsErr.message }, { status: 500 });

  return NextResponse.json({ project, agents });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const patch: { name?: string; description?: string | null } = {};
  if (typeof body?.name === "string") patch.name = body.name.trim();
  if ("description" in (body ?? {})) patch.description = body.description ?? null;
  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("id, name, description, created_at, updated_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
