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

  const { data: ds, error } = await supabase
    .from("data_sources")
    .select("id, project_id, kind, name, data, position, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // for nodegraph, also return nodes + edges so the canvas can hydrate in one call
  if (ds.kind === "nodegraph") {
    const [{ data: nodes }, { data: edges }] = await Promise.all([
      supabase
        .from("data_source_nodes")
        .select("id, type, position_x, position_y, data, updated_at")
        .eq("data_source_id", id),
      supabase
        .from("data_source_edges")
        .select("id, source_node_id, target_node_id, label")
        .eq("data_source_id", id),
    ]);
    return NextResponse.json({ dataSource: ds, nodes: nodes ?? [], edges: edges ?? [] });
  }

  return NextResponse.json({ dataSource: ds });
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
  if (typeof body?.name === "string") patch.name = body.name;
  if (typeof body?.position === "number") patch.position = body.position;
  if (body?.data !== undefined && typeof body.data === "object") patch.data = body.data;
  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("data_sources")
    .update(patch)
    .eq("id", id)
    .select("id, kind, name, data, position, created_at, updated_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ dataSource: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;

  const { error } = await supabase.from("data_sources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
