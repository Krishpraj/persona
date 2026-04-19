import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

type SkillRow = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  source: "inline" | "uploaded";
  created_at: string;
  updated_at: string;
};

export async function GET() {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("skills")
    .select("id, name, description, instructions, source, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ skills: (data ?? []) as SkillRow[] });
}

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase, user } = ctx;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const instructions = String(body?.instructions ?? "");
  const source: "inline" | "uploaded" =
    body?.source === "uploaded" ? "uploaded" : "inline";

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!instructions.trim())
    return NextResponse.json(
      { error: "instructions required" },
      { status: 400 }
    );

  const { data, error } = await supabase
    .from("skills")
    .insert({
      user_id: user.id,
      name,
      description,
      instructions,
      source,
    })
    .select(
      "id, name, description, instructions, source, created_at, updated_at"
    )
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ skill: data as SkillRow }, { status: 201 });
}
