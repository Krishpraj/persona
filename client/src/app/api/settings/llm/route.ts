import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { storeSecret, maskKey } from "@/lib/llm/vault";

type Provider = "openai" | "anthropic" | "ollama";
const PROVIDERS: Provider[] = ["openai", "anthropic", "ollama"];

export async function GET() {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  // Explicitly omit vault_secret_id from the projection
  const { data, error } = await supabase
    .from("llm_credentials")
    .select(
      "id, provider, label, key_preview, base_url, model_default, is_active, created_at, updated_at"
    )
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ credentials: data });
}

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { user } = ctx;

  const body = await req.json().catch(() => ({}));
  const provider = String(body?.provider ?? "") as Provider;
  const label = String(body?.label ?? "").trim();
  const apiKey = String(body?.apiKey ?? "");
  const baseUrl = body?.base_url ? String(body.base_url) : null;
  const modelDefault = body?.model_default ? String(body.model_default) : null;
  const setActive = body?.is_active !== false; // default true on first add

  if (!PROVIDERS.includes(provider))
    return NextResponse.json({ error: "invalid provider" }, { status: 400 });
  if (!label)
    return NextResponse.json({ error: "label required" }, { status: 400 });
  // Allow empty key for Ollama, require for hosted providers
  if (provider !== "ollama" && !apiKey)
    return NextResponse.json({ error: "apiKey required" }, { status: 400 });

  const rawForVault = apiKey || `${provider}-noauth`;
  const secretName = `llm:${user.id}:${provider}:${crypto.randomUUID()}`;
  const vault_secret_id = await storeSecret(
    rawForVault,
    secretName,
    `LLM credential for user ${user.id}`
  );

  const service = createServiceClient();

  // if activating, demote any existing active row for this user first
  if (setActive) {
    const { error: demoteErr } = await service
      .from("llm_credentials")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);
    if (demoteErr)
      return NextResponse.json({ error: demoteErr.message }, { status: 500 });
  }

  const { data, error } = await service
    .from("llm_credentials")
    .insert({
      user_id: user.id,
      provider,
      label,
      vault_secret_id,
      key_preview: maskKey(rawForVault),
      base_url: baseUrl,
      model_default: modelDefault,
      is_active: setActive,
    })
    .select(
      "id, provider, label, key_preview, base_url, model_default, is_active, created_at, updated_at"
    )
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ credential: data }, { status: 201 });
}
