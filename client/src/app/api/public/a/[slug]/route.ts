import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sb = createAnonClient();

  const { data: agent, error } = await sb
    .from("agents")
    .select("id, name, role, description, public_slug, is_published")
    .eq("public_slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [nodesRes, edgesRes] = await Promise.all([
    sb
      .from("agent_nodes")
      .select("id, type, position_x, position_y, data")
      .eq("agent_id", agent.id),
    sb
      .from("agent_edges")
      .select("id, source_node_id, target_node_id, label")
      .eq("agent_id", agent.id),
  ]);
  if (nodesRes.error)
    return NextResponse.json({ error: nodesRes.error.message }, { status: 500 });
  if (edgesRes.error)
    return NextResponse.json({ error: edgesRes.error.message }, { status: 500 });

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      description: agent.description,
      public_slug: agent.public_slug,
    },
    nodes: nodesRes.data,
    edges: edgesRes.data,
  });
}
