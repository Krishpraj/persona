import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "agent";
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;

  const { data: agent, error: findErr } = await supabase
    .from("agents")
    .select("id, name, public_slug")
    .eq("id", id)
    .maybeSingle();
  if (findErr)
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  if (!agent)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let slug = agent.public_slug;
  if (!slug) {
    const base = slugify(agent.name);
    for (let i = 0; i < 5; i++) {
      const candidate = `${base}-${shortId()}`;
      const { data: clash } = await supabase
        .from("agents")
        .select("id")
        .eq("public_slug", candidate)
        .maybeSingle();
      if (!clash) {
        slug = candidate;
        break;
      }
    }
    if (!slug)
      return NextResponse.json(
        { error: "could not generate unique slug" },
        { status: 500 }
      );
  }

  const { data, error } = await supabase
    .from("agents")
    .update({
      is_published: true,
      public_slug: slug,
      published_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, is_published, public_slug, published_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agent: data, url: `/a/${data.public_slug}` });
}
