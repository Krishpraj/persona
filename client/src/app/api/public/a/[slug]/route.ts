import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase-server";
import { PUBLIC_CORS_HEADERS, corsPreflight } from "@/lib/cors";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sb = createAnonClient();

  const { data: agent, error } = await sb
    .from("agents")
    .select("id, project_id, name, role, description, public_slug, is_published")
    .eq("public_slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  if (!agent)
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: PUBLIC_CORS_HEADERS }
    );

  const { data: sources } = await sb
    .from("data_sources")
    .select("id, kind, name, position")
    .eq("project_id", agent.project_id)
    .order("position", { ascending: true });

  return NextResponse.json(
    {
      agent: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        description: agent.description,
        public_slug: agent.public_slug,
      },
      dataSources: sources ?? [],
    },
    { headers: PUBLIC_CORS_HEADERS }
  );
}
