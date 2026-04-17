import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase, user } = ctx;
  const { id: agentId } = await params;

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : undefined;
  const source_node_id = String(body?.source_node_id ?? "");
  const target_node_id = String(body?.target_node_id ?? "");
  if (!source_node_id || !target_node_id)
    return NextResponse.json(
      { error: "source_node_id and target_node_id required" },
      { status: 400 }
    );

  const { data, error } = await supabase
    .from("agent_edges")
    .insert({
      ...(id ? { id } : {}),
      agent_id: agentId,
      user_id: user.id,
      source_node_id,
      target_node_id,
      label: body?.label ?? null,
    })
    .select("id, source_node_id, target_node_id, label")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ edge: data }, { status: 201 });
}
