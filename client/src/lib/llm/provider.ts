import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOllama } from "ollama-ai-provider";
import type { LanguageModel } from "ai";
import { createServiceClient } from "../supabase-server";
import { readSecret } from "./vault";

export type LlmProvider = "openai" | "anthropic" | "ollama";

type CredentialRow = {
  id: string;
  provider: LlmProvider;
  vault_secret_id: string;
  base_url: string | null;
  model_default: string | null;
};

const DEFAULT_MODEL: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  ollama: "llama3.1",
};

async function loadActiveCredential(
  userId: string
): Promise<CredentialRow | null> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("llm_credentials")
    .select("id, provider, vault_secret_id, base_url, model_default")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`credential load failed: ${error.message}`);
  return data as CredentialRow | null;
}

function buildModel(cred: CredentialRow, apiKey: string): LanguageModel {
  const model = cred.model_default || DEFAULT_MODEL[cred.provider];
  switch (cred.provider) {
    case "openai": {
      const client = createOpenAI({
        apiKey,
        baseURL: cred.base_url ?? undefined,
      });
      return client(model);
    }
    case "anthropic": {
      const client = createAnthropic({ apiKey });
      return client(model);
    }
    case "ollama": {
      const client = createOllama({
        baseURL: cred.base_url ?? "http://localhost:11434/api",
      });
      return client(model);
    }
  }
}

export async function getModelFor(userId: string): Promise<LanguageModel> {
  const cred = await loadActiveCredential(userId);
  if (!cred) {
    throw new Error("NO_ACTIVE_CREDENTIAL");
  }
  // Ollama doesn't need a real key, but we still stored one (likely empty/placeholder)
  const apiKey = cred.provider === "ollama"
    ? (await readSecret(cred.vault_secret_id).catch(() => "ollama"))
    : await readSecret(cred.vault_secret_id);
  return buildModel(cred, apiKey);
}
