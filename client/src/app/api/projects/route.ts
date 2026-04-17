import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function GET() {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase, user } = ctx;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const description = body?.description ? String(body.description) : null;
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({ name, description, user_id: user.id })
    .select("id, name, description, created_at, updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
