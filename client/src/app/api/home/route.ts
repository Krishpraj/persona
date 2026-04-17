import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function GET() {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;

  const [projectsRes, agentsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, description, created_at, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("agents")
      .select(
        "id, name, role, description, is_published, public_slug, updated_at, project_id"
      )
      .order("updated_at", { ascending: false }),
  ]);

  if (projectsRes.error)
    return NextResponse.json({ error: projectsRes.error.message }, { status: 500 });
  if (agentsRes.error)
    return NextResponse.json({ error: agentsRes.error.message }, { status: 500 });

  return NextResponse.json({
    projects: projectsRes.data ?? [],
    agents: agentsRes.data ?? [],
  });
}
