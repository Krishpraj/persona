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

  const { data: agent, error } = await supabase
    .from("agents")
    .select(
      "id, project_id, name, role, description, system_prompt, is_published, public_slug, published_at, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [nodesRes, edgesRes] = await Promise.all([
    supabase
      .from("agent_nodes")
      .select("id, type, position_x, position_y, data, updated_at")
      .eq("agent_id", id),
    supabase
      .from("agent_edges")
      .select("id, source_node_id, target_node_id, label")
      .eq("agent_id", id),
  ]);
  if (nodesRes.error)
    return NextResponse.json({ error: nodesRes.error.message }, { status: 500 });
  if (edgesRes.error)
    return NextResponse.json({ error: edgesRes.error.message }, { status: 500 });

  return NextResponse.json({
    agent,
    nodes: nodesRes.data,
    edges: edgesRes.data,
  });
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
  const patch: Record<string, unknown> = {};
  for (const key of ["name", "role", "description", "system_prompt"]) {
    if (key in (body ?? {})) patch[key] = body[key] ?? null;
  }
  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("agents")
    .update(patch)
    .eq("id", id)
    .select(
      "id, project_id, name, role, description, system_prompt, is_published, public_slug, published_at, updated_at"
    )
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ agent: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
