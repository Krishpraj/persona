import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;

  const { data, error } = await supabase
    .from("agents")
    .update({ is_published: false })
    .eq("id", id)
    .select("id, is_published, public_slug")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ agent: data });
}
