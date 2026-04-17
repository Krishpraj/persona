import { createServiceClient } from "../supabase-server";

// Wraps Supabase Vault via public-schema helper RPCs.
// All operations require the service_role — never call from the browser.

export async function storeSecret(
  raw: string,
  name: string,
  description = ""
): Promise<string> {
  const sb = createServiceClient();
  const { data, error } = await sb.rpc("create_vault_secret", {
    new_secret: raw,
    new_name: name,
    new_description: description,
  });
  if (error) throw new Error(`vault create failed: ${error.message}`);
  return data as string;
}

export async function readSecret(secretId: string): Promise<string> {
  const sb = createServiceClient();
  const { data, error } = await sb.rpc("read_vault_secret", {
    secret_id: secretId,
  });
  if (error) throw new Error(`vault read failed: ${error.message}`);
  if (!data) throw new Error("vault secret not found");
  return data as string;
}

export function maskKey(raw: string): string {
  if (raw.length <= 8) return "•".repeat(raw.length);
  return `${raw.slice(0, 3)}…${raw.slice(-4)}`;
}
