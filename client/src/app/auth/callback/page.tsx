"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// OAuth return handler. The Supabase browser client (@supabase/ssr) auto-
// processes both PKCE `?code=…` and legacy implicit `#access_token=…` flows
// when the page loads, so we just wait for the session and bounce.
//
// Explicit error params from the provider (?error=…&error_description=…) are
// surfaced immediately instead of hanging.

export default function AuthCallback() {
  return (
    <Suspense fallback={<Waiting label="Finishing sign-in…" />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    const providerError =
      params.get("error_description") || params.get("error");
    if (providerError) {
      setStatus("error");
      setMessage(providerError);
      return;
    }

    let cancelled = false;
    const next = params.get("next") || "/home";

    async function finish() {
      // Give the browser client a beat to finish its auto-exchange / hash parse.
      for (let i = 0; i < 20; i++) {
        if (cancelled) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace(next);
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      if (cancelled) return;
      setStatus("error");
      setMessage(
        "We didn't receive a session from the provider. Please try signing in again."
      );
    }

    finish();

    // Also listen for the session becoming available — the browser client
    // fires this as soon as it finishes processing the URL.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) router.replace(next);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [params, router]);

  if (status === "error") {
    return <ErrorCard message={message} />;
  }
  return <Waiting label={message} />;
}

function Waiting({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Dot delay={0} />
          <Dot delay={180} />
          <Dot delay={360} />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-foreground/70"
      style={{
        animation: "typing-dot 1.1s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
      aria-hidden
    />
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-[420px] border border-border/70 bg-card/40 px-6 py-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-destructive">
          sign-in failed
        </div>
        <p className="mt-2 text-[14px] leading-relaxed">{message}</p>
        <Link
          href="/signin"
          className="mt-5 inline-flex h-10 items-center border border-foreground bg-foreground px-4 font-mono text-[11px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-foreground/90"
        >
          back to sign-in
        </Link>
      </div>
    </div>
  );
}
