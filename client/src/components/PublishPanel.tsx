"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Agent = {
  id: string;
  is_published: boolean;
  public_slug: string | null;
};

type Props = {
  agent: Agent;
  publishing: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
};

export function PublishPanel({ agent, publishing, onPublish, onUnpublish }: Props) {
  const slug = agent.public_slug;
  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const publicUrl = slug ? `${origin}/a/${slug}` : null;
  const embedUrl = slug ? `${origin}/embed/${slug}` : null;
  const apiUrl = slug ? `${origin}/api/public/a/${slug}/chat` : null;

  const iframeSnippet =
    embedUrl &&
    `<iframe
  src="${embedUrl}"
  width="380"
  height="560"
  style="border:1px solid #2c2a26;background:#ece7dc"
  title="chat with this agent"
></iframe>`;

  const curlSnippet =
    apiUrl &&
    `curl -X POST '${apiUrl}' \\
  -H 'content-type: application/json' \\
  -d '{"message":"Hello","history":[]}'`;

  const fetchSnippet =
    apiUrl &&
    `const res = await fetch("${apiUrl}", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    message: "Hello",
    history: [],
  }),
});
const { reply } = await res.json();`;

  return (
    <section className="mt-10">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          share &amp; embed
        </div>
        {agent.is_published ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            live
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            draft
          </span>
        )}
      </div>

      <div className="border border-border/70 bg-card/30">
        <div className="flex items-start gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-medium tracking-tight">
              {agent.is_published ? "This agent is live" : "Ready to publish?"}
            </div>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {agent.is_published
                ? "Anyone with the link can chat with it. You can unpublish any time."
                : "Publishing generates a shareable URL, an iframe snippet, and a public API endpoint."}
            </p>
          </div>
          <button
            onClick={agent.is_published ? onUnpublish : onPublish}
            disabled={publishing}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-none border px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
              agent.is_published
                ? "border-border/70 bg-background/40 text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                : "border-foreground bg-foreground text-background hover:bg-foreground/90",
              publishing && "opacity-60"
            )}
          >
            {publishing
              ? "…"
              : agent.is_published
              ? "unpublish"
              : "publish"}
          </button>
        </div>

        {agent.is_published && publicUrl && (
          <>
            <Row label="public URL">
              <CopyField value={publicUrl}>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-primary underline-offset-2 hover:underline"
                >
                  {publicUrl}
                </a>
              </CopyField>
            </Row>

            <Row label="iframe embed">
              <CopyBlock value={iframeSnippet ?? ""} language="html" />
              <p className="mt-2 text-[11.5px] text-muted-foreground">
                Paste this into any HTML page. The iframe loads a chrome-less chat
                that talks to <code className="font-mono">{apiUrl}</code> cross-origin.
              </p>
            </Row>

            <Row label="api · curl">
              <CopyBlock value={curlSnippet ?? ""} language="shell" />
            </Row>

            <Row label="api · fetch">
              <CopyBlock value={fetchSnippet ?? ""} language="ts" />
              <p className="mt-2 text-[11.5px] text-muted-foreground">
                <strong className="font-medium text-foreground">Request:</strong>{" "}
                <code className="font-mono">
                  POST &#123; message: string; history: &#123;role:&quot;user&quot;|&quot;assistant&quot;, content:string&#125;[] &#125;
                </code>
                <br />
                <strong className="font-medium text-foreground">Response:</strong>{" "}
                <code className="font-mono">200 &#123; reply: string &#125;</code>
              </p>
            </Row>
          </>
        )}
      </div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 border-t border-border/60 px-5 py-4 sm:grid-cols-[140px_1fr] sm:items-start sm:gap-6">
      <div className="pt-1 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function CopyField({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1 truncate border border-border/60 bg-background/40 px-3 py-2 font-mono text-[12px]">
        {children}
      </div>
      <CopyButton value={value} copied={copied} onCopy={() => setCopied(true)} onReset={() => setCopied(false)} />
    </div>
  );
}

function CopyBlock({ value, language }: { value: string; language: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground/70">
          {language}
        </span>
        <CopyButton
          value={value}
          copied={copied}
          onCopy={() => setCopied(true)}
          onReset={() => setCopied(false)}
        />
      </div>
      <pre className="max-h-[260px] overflow-auto border border-border/60 bg-background/40 px-3 py-2 pr-20 font-mono text-[12px] leading-relaxed">
        {value}
      </pre>
    </div>
  );
}

function CopyButton({
  value,
  copied,
  onCopy,
  onReset,
}: {
  value: string;
  copied: boolean;
  onCopy: () => void;
  onReset: () => void;
}) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          onCopy();
          window.setTimeout(onReset, 1400);
        } catch {
          // ignore
        }
      }}
      className={cn(
        "inline-flex h-7 items-center rounded-none border px-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
        copied
          ? "border-primary/70 bg-primary/10 text-primary"
          : "border-border/70 bg-background/60 text-muted-foreground hover:border-primary/60 hover:text-foreground"
      )}
      aria-label="Copy"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}
