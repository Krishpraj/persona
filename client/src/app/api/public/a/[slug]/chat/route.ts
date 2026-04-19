import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase-server";
import { runAgentChat } from "@/lib/llm/runAgent";
import { PUBLIC_CORS_HEADERS, corsPreflight } from "@/lib/cors";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const message = String(body?.message ?? "").trim();
  const history = Array.isArray(body?.history) ? body.history : [];
  if (!message)
    return NextResponse.json(
      { error: "message required" },
      { status: 400, headers: PUBLIC_CORS_HEADERS }
    );

  const sb = createAnonClient();
  const { data: agent, error } = await sb
    .from("agents")
    .select("id")
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

  try {
    const reply = await runAgentChat(agent.id, history, message);
    return NextResponse.json({ reply }, { headers: PUBLIC_CORS_HEADERS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "chat failed";
    if (msg === "NO_ACTIVE_CREDENTIAL") {
      return NextResponse.json(
        { error: "This agent's owner has no active LLM credential." },
        { status: 400, headers: PUBLIC_CORS_HEADERS }
      );
    }
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }
}
