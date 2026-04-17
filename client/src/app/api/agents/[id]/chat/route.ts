import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";
import { runAgentChat } from "@/lib/llm/runAgent";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const message = String(body?.message ?? "").trim();
  const history = Array.isArray(body?.history) ? body.history : [];
  if (!message)
    return NextResponse.json({ error: "message required" }, { status: 400 });

  // confirm the agent is visible under the caller's RLS
  const { data: agent, error: agentErr } = await supabase
    .from("agents")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (agentErr)
    return NextResponse.json({ error: agentErr.message }, { status: 500 });
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const reply = await runAgentChat(id, history, message);
    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "chat failed";
    if (msg === "NO_ACTIVE_CREDENTIAL") {
      return NextResponse.json(
        { error: "No active LLM credential. Add one in /settings." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
