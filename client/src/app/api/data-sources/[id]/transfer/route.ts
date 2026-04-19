import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase, user } = ctx;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const targetProjectId = String(body?.project_id ?? "");
  if (!targetProjectId)
    return NextResponse.json({ error: "project_id required" }, { status: 400 });

  // Verify the target project belongs to the caller (RLS also enforces this).
  const { data: targetProject } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", targetProjectId)
    .maybeSingle();
  if (!targetProject || targetProject.user_id !== user.id)
    return NextResponse.json({ error: "target project not accessible" }, { status: 403 });

  const { data, error } = await supabase
    .from("data_sources")
    .update({ project_id: targetProjectId })
    .eq("id", id)
    .select("id, project_id, kind, name")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ dataSource: data });
}
