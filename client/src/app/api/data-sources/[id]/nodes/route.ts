import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase, user } = ctx;
  const { id: dataSourceId } = await params;

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : undefined;
  const type = typeof body?.type === "string" ? body.type : "knowledge";
  const position_x = Number(body?.position_x ?? body?.position?.x ?? 0);
  const position_y = Number(body?.position_y ?? body?.position?.y ?? 0);
  const data = body?.data && typeof body.data === "object" ? body.data : {};

  const { data: row, error } = await supabase
    .from("data_source_nodes")
    .insert({
      ...(id ? { id } : {}),
      data_source_id: dataSourceId,
      user_id: user.id,
      type,
      position_x,
      position_y,
      data,
    })
    .select("id, type, position_x, position_y, data, updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ node: row }, { status: 201 });
}
