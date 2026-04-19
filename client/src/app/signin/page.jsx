"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ——————————————————————————————————————————————————————————————
 * Sign-in page. Password + OAuth (Google, GitHub). No magic link.
 * —————————————————————————————————————————————————————————————— */

export default function SignIn() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/home";
  const initialError = searchParams.get("error") || "";

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(""); // "" | "google" | "github"
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState("");

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(nextPath);
        return;
      }
      // signup
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
              : undefined,
        },
      });
      if (error) throw error;
      setNotice("Check your inbox to confirm your email.");
    } catch (err) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError("");
    setNotice("");
    setOauthLoading(provider);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
          : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
      // Redirect happens via the provider; setOauthLoading will be cleared on return.
    } catch (err) {
      setError(err?.message ?? "OAuth failed.");
      setOauthLoading("");
    }
  };

  const isSignin = mode === "signin";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-6 sm:px-8">
          <Link href="/" className="flex items-baseline tracking-tight">
            <span className="text-[16px] font-medium">persona</span>
            <span className="cursor-blink ml-0.5 font-mono text-[18px] leading-none text-primary">
              _
            </span>
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          {/* mode toggle */}
          <div className="mb-6 inline-flex w-full items-stretch border border-border/70 bg-card/30">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={cn(
                "flex-1 h-10 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors cursor-pointer",
                isSignin
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={cn(
                "flex-1 h-10 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors cursor-pointer",
                !isSignin
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Create account
            </button>
          </div>

          <div className="mb-8">
            <h1 className="text-[28px] font-medium leading-[1.1] tracking-[-0.025em]">
              {isSignin ? "Welcome back." : "Create your workspace."}
            </h1>
            <p className="mt-2 text-[13.5px] text-muted-foreground">
              {isSignin
                ? "Pick up where you left off."
                : "Start with a blank canvas. No signup ceremony."}
            </p>
          </div>

          {/* OAuth */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              loading={oauthLoading === "google"}
              disabled={loading || (oauthLoading && oauthLoading !== "google")}
              onClick={() => handleOAuth("google")}
              className="w-full justify-start gap-3 font-normal"
            >
              <GoogleMark />
              <span className="flex-1 text-left text-[13.5px]">
                Continue with Google
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              loading={oauthLoading === "github"}
              disabled={loading || (oauthLoading && oauthLoading !== "github")}
              onClick={() => handleOAuth("github")}
              className="w-full justify-start gap-3 font-normal"
            >
              <GithubMark />
              <span className="flex-1 text-left text-[13.5px]">
                Continue with GitHub
              </span>
            </Button>
          </div>

          {/* divider */}
          <div className="my-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-px flex-1 bg-border/70" />
            <span>or</span>
            <span className="h-px flex-1 bg-border/70" />
          </div>

          {/* email / password */}
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            {!isSignin && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input
                    type="text"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ada"
                    className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[14px] focus:border-primary/70 focus:outline-none"
                  />
                </Field>
                <Field label="Last name">
                  <input
                    type="text"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Lovelace"
                    className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[14px] focus:border-primary/70 focus:outline-none"
                  />
                </Field>
              </div>
            )}

            <Field label="Email">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[14px] focus:border-primary/70 focus:outline-none"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                required
                autoComplete={isSignin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[14px] focus:border-primary/70 focus:outline-none"
              />
            </Field>

            {error && (
              <div className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
                {error}
              </div>
            )}
            {notice && (
              <div className="border border-primary/40 bg-primary/10 px-3 py-2 text-[12.5px] text-foreground">
                {notice}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={loading}
              disabled={!!oauthLoading}
              className="w-full"
            >
              {isSignin ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
            {isSignin ? "New here? " : "Already have one? "}
            <button
              type="button"
              onClick={() => switchMode(isSignin ? "signup" : "signin")}
              className="cursor-pointer text-foreground underline-offset-4 hover:underline"
            >
              {isSignin ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/* — provider marks — */

function GoogleMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.1 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function GithubMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0 text-foreground"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.17.91-.25 1.89-.38 2.86-.38s1.95.13 2.86.38c2.19-1.48 3.15-1.17 3.15-1.17.62 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.37-5.25 5.65.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
      />
    </svg>
  );
}
