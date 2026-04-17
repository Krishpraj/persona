"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

/* ——————————————————————————————————————————————————————————————
 * PRIMITIVES (mirror landing page language)
 * —————————————————————————————————————————————————————————————— */

function Plus({ className }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute font-mono text-[14px] leading-none text-primary/60 select-none",
        className
      )}
    >
      +
    </span>
  );
}

function Frame({ className, children, plus = true }) {
  return (
    <div className={cn("relative", className)}>
      {plus && (
        <>
          <Plus className="-left-[6px] -top-[6px]" />
          <Plus className="-right-[6px] -top-[6px]" />
          <Plus className="-left-[6px] -bottom-[6px]" />
          <Plus className="-right-[6px] -bottom-[6px]" />
        </>
      )}
      {children}
    </div>
  );
}

function Eyebrow({ children }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
      <span className="h-px w-8 bg-primary/60" />
      {children}
    </span>
  );
}

/* ——————————————————————————————————————————————————————————————
 * HEADER (minimal — just the wordmark back to /)
 * —————————————————————————————————————————————————————————————— */

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 sm:px-8">
        <Link href="/" className="flex items-baseline tracking-tight">
          <span className="text-[16px] font-medium">persona</span>
          <span className="cursor-blink ml-0.5 font-mono text-[18px] leading-none text-primary">
            _
          </span>
        </Link>
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← back
        </Link>
      </div>
    </header>
  );
}

/* ——————————————————————————————————————————————————————————————
 * SIGN IN
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
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "magic"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const resetStatus = () => {
    setError("");
    setNotice("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetStatus();
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

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
          },
        });
        if (error) throw error;
        setNotice("Check your inbox to confirm your email.");
        return;
      }

      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}${nextPath}`
                : undefined,
          },
        });
        if (error) throw error;
        setNotice("Magic link sent. Check your inbox.");
      }
    } catch (err) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const modeCopy = {
    signin: {
      eyebrow: "[ 00 ] / access",
      title: (
        <>
          Sign in to{" "}
          <span className="text-primary">your graph</span>.
        </>
      ),
      sub: "Pick up where you left off. Your nodes, edges, and agents are waiting.",
      cta: "Sign in",
      footer: (
        <>
          New here?{" "}
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              resetStatus();
            }}
            className="text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Create an account
          </button>
          <span className="mx-2 text-border">·</span>
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              resetStatus();
            }}
            className="text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Email me a magic link
          </button>
        </>
      ),
    },
    signup: {
      eyebrow: "[ 00 ] / new",
      title: (
        <>
          Create your{" "}
          <span className="text-primary">workspace</span>.
        </>
      ),
      sub: "Start with a blank canvas or import what you already have. No signup ceremony.",
      cta: "Create account",
      footer: (
        <>
          Already have one?{" "}
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              resetStatus();
            }}
            className="text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Sign in
          </button>
        </>
      ),
    },
    magic: {
      eyebrow: "[ 00 ] / magic",
      title: (
        <>
          One-click{" "}
          <span className="text-primary">access</span>.
        </>
      ),
      sub: "We'll email you a link. Click it, you're in. No password required.",
      cta: "Send magic link",
      footer: (
        <>
          Prefer a password?{" "}
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              resetStatus();
            }}
            className="text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Sign in
          </button>
        </>
      ),
    },
  }[mode];

  const showPassword = mode !== "magic";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0" aria-hidden />
        <div className="amber-wash absolute inset-0" aria-hidden />

        <section className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl items-center px-6 py-16 sm:px-8">
          <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            {/* left — copy */}
            <Reveal>
              <Eyebrow>{modeCopy.eyebrow}</Eyebrow>
              <h1 className="mt-4 text-[2.5rem] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]">
                {modeCopy.title}
              </h1>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                {modeCopy.sub}
              </p>

              <div className="mt-8 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 border-t border-border/50 pt-6">
                {[
                  ["typed nodes", "not chunks"],
                  ["any model", "one runtime"],
                  ["provenance", "by default"],
                  ["self-hostable", "byo postgres"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-baseline gap-2 font-mono text-[11px] text-muted-foreground"
                  >
                    <span className="text-primary/80">+</span>
                    <span className="text-foreground/90">{k}</span>
                    <span className="text-border">/</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* right — form */}
            <Reveal delay={160}>
              <Frame>
                <div className="relative overflow-hidden rounded-md border border-border/80 bg-card/70 backdrop-blur-sm">
                  {/* accent rail */}
                  <div
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                    aria-hidden
                  />

                  {/* breadcrumb-style header */}
                  <div className="flex items-center justify-between border-b border-border/60 bg-background/40 px-4 py-2.5 font-mono text-[11px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="inline-block h-2 w-2 rounded-[2px] bg-primary/80" />
                      <span className="text-foreground/80">auth</span>
                      <span className="text-border">/</span>
                      <span>session</span>
                      <span className="text-border">/</span>
                      <span className="text-foreground/50">
                        {mode === "signin"
                          ? "login"
                          : mode === "signup"
                          ? "register"
                          : "otp"}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      <span className="text-primary/80">●</span> secure
                    </span>
                  </div>

                  <form onSubmit={handleSubmit} className="px-6 py-7 sm:px-8">
                    {/* name (signup only) */}
                    {mode === "signup" && (
                      <div className="mb-5 grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                            first name
                          </span>
                          <input
                            type="text"
                            required
                            autoComplete="given-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Ada"
                            className="mt-2 w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/40"
                          />
                        </label>
                        <label className="block">
                          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                            last name
                          </span>
                          <input
                            type="text"
                            required
                            autoComplete="family-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Lovelace"
                            className="mt-2 w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/40"
                          />
                        </label>
                      </div>
                    )}

                    {/* email */}
                    <label className="block">
                      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                        email
                      </span>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="mt-2 w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                    </label>

                    {/* password */}
                    {showPassword && (
                      <label className="mt-5 block">
                        <div className="flex items-baseline justify-between">
                          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                            password
                          </span>
                          {mode === "signin" && (
                            <button
                              type="button"
                              onClick={() => {
                                setMode("magic");
                                resetStatus();
                              }}
                              className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
                            >
                              forgot?
                            </button>
                          )}
                        </div>
                        <input
                          type="password"
                          required={showPassword}
                          autoComplete={
                            mode === "signup"
                              ? "new-password"
                              : "current-password"
                          }
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          minLength={6}
                          className="mt-2 w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </label>
                    )}

                    {/* status */}
                    {error && (
                      <div className="mt-5 border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-[12px] text-destructive">
                        <span className="text-destructive/80">×</span> {error}
                      </div>
                    )}
                    {notice && (
                      <div className="mt-5 border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-[12px] text-primary">
                        <span className="text-primary/80">→</span> {notice}
                      </div>
                    )}

                    {/* submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-none border border-primary/70 bg-primary px-5 text-[13px] font-medium tracking-tight text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <span className="font-mono text-[12px] uppercase tracking-[0.22em]">
                          working…
                        </span>
                      ) : (
                        modeCopy.cta
                      )}
                    </button>

                    {/* footer links */}
                    <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
                      {modeCopy.footer}
                    </p>
                  </form>

                  {/* provenance strip */}
                  <div className="border-t border-border/60 bg-background/50 px-4 py-3 font-mono text-[11px]">
                    <div className="flex items-center justify-between gap-3 text-muted-foreground">
                      <span className="truncate">
                        <span className="text-primary/80">→</span> supabase{" "}
                        <span className="text-border">·</span> tls{" "}
                        <span className="text-border">·</span> jwt
                      </span>
                      <span className="shrink-0">
                        <span className="text-foreground/70">enc</span>{" "}
                        <span className="mx-1.5 text-border">|</span>
                        <span className="text-primary/80">✓</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-10 -bottom-6 h-10 rounded-full bg-primary/20 blur-3xl" />
              </Frame>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
}
