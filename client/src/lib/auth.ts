import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerClient } from "./supabase-server";

export type AuthedContext = { user: User; supabase: SupabaseClient };

export async function requireUser(): Promise<AuthedContext | NextResponse> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { user: data.user, supabase };
}

export function isAuthResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}
