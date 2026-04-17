import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;
  const { error } = await supabase.from("agent_edges").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
