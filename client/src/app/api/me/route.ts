import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

export async function GET() {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase, user } = ctx;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile: profile ?? null,
  });
}

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase, user } = ctx;

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if ("first_name" in (body ?? {})) patch.first_name = body.first_name ?? null;
  if ("last_name" in (body ?? {})) patch.last_name = body.last_name ?? null;
  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select("first_name, last_name")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
