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
      "id, project_id, name, role, description, system_prompt, is_published, public_slug, published_at, created_at, updated_at, mcp_integration_ids, skill_ids"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ agent });
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

  if ("mcp_integration_ids" in (body ?? {})) {
    const raw = body.mcp_integration_ids;
    if (!Array.isArray(raw))
      return NextResponse.json(
        { error: "mcp_integration_ids must be an array" },
        { status: 400 }
      );
    const ids = raw.map((x) => String(x)).filter((x) => x.length > 0);
    if (ids.length > 0) {
      const { data: owned, error: ownErr } = await supabase
        .from("mcp_integrations")
        .select("id")
        .in("id", ids);
      if (ownErr)
        return NextResponse.json({ error: ownErr.message }, { status: 500 });
      if ((owned?.length ?? 0) !== ids.length)
        return NextResponse.json(
          { error: "invalid mcp_integration_ids" },
          { status: 400 }
        );
    }
    patch.mcp_integration_ids = ids;
  }

  if ("skill_ids" in (body ?? {})) {
    const raw = body.skill_ids;
    if (!Array.isArray(raw))
      return NextResponse.json(
        { error: "skill_ids must be an array" },
        { status: 400 }
      );
    const ids = raw.map((x) => String(x)).filter((x) => x.length > 0);
    if (ids.length > 0) {
      const { data: owned, error: ownErr } = await supabase
        .from("skills")
        .select("id")
        .in("id", ids);
      if (ownErr)
        return NextResponse.json({ error: ownErr.message }, { status: 500 });
      if ((owned?.length ?? 0) !== ids.length)
        return NextResponse.json(
          { error: "invalid skill_ids" },
          { status: 400 }
        );
    }
    patch.skill_ids = ids;
  }

  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("agents")
    .update(patch)
    .eq("id", id)
    .select(
      "id, project_id, name, role, description, system_prompt, is_published, public_slug, published_at, updated_at, mcp_integration_ids, skill_ids"
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
