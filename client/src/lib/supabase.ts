import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

// Lazy singleton: `createBrowserClient` instantiates a GoTrue auth client that
// touches `globalThis.localStorage` eagerly. Next.js SSRs "use client" modules
// once on the server to produce the initial HTML — and its Node runtime ships a
// broken `localStorage` shim, so calling `createBrowserClient` at module scope
// crashes the server render. Wrapping in a Proxy defers creation until the
// first property access (which only happens from an event handler / effect —
// i.e. after hydration, in the real browser).
let cached: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (cached) return cached;
  cached = createBrowserClient(supabaseUrl, supabaseKey);
  return cached;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient() as unknown as Record<PropertyKey, unknown>;
    const value = client[prop as PropertyKey];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});
