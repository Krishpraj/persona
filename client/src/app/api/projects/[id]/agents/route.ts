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

  const { data, error } = await supabase
    .from("agents")
    .select("id, name, role, description, is_published, public_slug, updated_at")
    .eq("project_id", id)
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agents: data });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase, user } = ctx;
  const { id: projectId } = await params;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  if (!name)
    return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("agents")
    .insert({
      project_id: projectId,
      user_id: user.id,
      name,
      role: body?.role ?? null,
      description: body?.description ?? null,
      system_prompt: body?.system_prompt ?? null,
    })
    .select("id, name, role, description, is_published, public_slug, updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agent: data }, { status: 201 });
}
