"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/Loading";
import {
  agentNodeTypes,
  NODE_TYPE_OPTIONS,
  type AgentNodeType,
} from "@/components/agent-nodes";
import {
  uploadNodeAsset,
  deleteNodeAsset,
  isAcceptedImage,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_MB,
} from "@/lib/node-assets";

type AgentRow = {
  id: string;
  name: string;
  role: string | null;
  description: string | null;
  system_prompt: string | null;
  is_published: boolean;
  public_slug: string | null;
};

type NodeRow = {
  id: string;
  type: string;
  position_x: number;
  position_y: number;
  data: Record<string, unknown>;
};

type EdgeRow = {
  id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
};

type ChatTurn = { role: "user" | "assistant"; content: string };

function uuid() {
  return crypto.randomUUID();
}

function normalizeNodeType(t: string): AgentNodeType {
  if (t === "image" || t === "link") return t;
  return "text";
}

function defaultDataFor(type: AgentNodeType): Record<string, unknown> {
  if (type === "image") return { label: "Image", caption: "" };
  if (type === "link") return { label: "Link", url: "", description: "" };
  return { label: "Text", content: "" };
}

function AgentCanvas() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const agentId = params.id;

  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/agents/${agentId}`, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/signin");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Failed to load");
        setLoading(false);
        return;
      }
      const a = body.agent as AgentRow;
      setAgent(a);
      if (a.is_published && a.public_slug) {
        setPublishUrl(`/a/${a.public_slug}`);
      }
      setNodes(
        (body.nodes as NodeRow[]).map((n) => ({
          id: n.id,
          type: normalizeNodeType(n.type),
          position: { x: n.position_x, y: n.position_y },
          data: {
            ...n.data,
            label: (n.data?.label as string) || n.type,
          },
        }))
      );
      setEdges(
        (body.edges as EdgeRow[]).map((e) => ({
          id: e.id,
          source: e.source_node_id,
          target: e.target_node_id,
          label: e.label ?? undefined,
        }))
      );
      setLoading(false);
    }
    load();
  }, [agentId, router]);

  const scheduleNodeSave = useCallback(
    (nodeId: string, payload: Record<string, unknown>) => {
      const existing = saveTimers.current.get(nodeId);
      if (existing) clearTimeout(existing);
      const t = setTimeout(async () => {
        try {
          await fetch(`/api/nodes/${nodeId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch {
          // transient; next edit will retry
        }
        saveTimers.current.delete(nodeId);
      }, 400);
      saveTimers.current.set(nodeId, t);
    },
    []
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((curr) => applyNodeChanges(changes, curr));
      for (const change of changes as NodeChange[]) {
        if (change.type === "position" && change.dragging === false && change.position) {
          scheduleNodeSave(change.id, {
            position_x: change.position.x,
            position_y: change.position.y,
          });
        }
        if (change.type === "remove") {
          fetch(`/api/nodes/${change.id}`, { method: "DELETE" });
          if (selectedNodeId === change.id) setSelectedNodeId(null);
        }
      }
    },
    [scheduleNodeSave, selectedNodeId]
  );

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((curr) => applyEdgeChanges(changes, curr));
    for (const change of changes) {
      if (change.type === "remove") {
        fetch(`/api/edges/${change.id}`, { method: "DELETE" });
      }
    }
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const id = uuid();
      setEdges((curr) => addEdge({ ...connection, id }, curr));
      fetch(`/api/agents/${agentId}/edges`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          source_node_id: connection.source,
          target_node_id: connection.target,
        }),
      });
    },
    [agentId]
  );

  const addNode = useCallback(
    async (type: AgentNodeType) => {
      const id = uuid();
      const position = {
        x: 120 + Math.random() * 240,
        y: 120 + Math.random() * 160,
      };
      const data = defaultDataFor(type);
      setNodes((curr) => [
        ...curr,
        { id, type, position, data, selected: true },
      ]);
      setSelectedNodeId(id);
      setAddMenuOpen(false);
      await fetch(`/api/agents/${agentId}/nodes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          type,
          position_x: position.x,
          position_y: position.y,
          data,
        }),
      });
    },
    [agentId]
  );

  const updateNodeData = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      setNodes((curr) =>
        curr.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...(n.data ?? {}), ...patch } }
            : n
        )
      );
      const merged = (() => {
        const n = nodes.find((x) => x.id === nodeId);
        return { ...(n?.data ?? {}), ...patch };
      })();
      scheduleNodeSave(nodeId, { data: merged });
    },
    [nodes, scheduleNodeSave]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((curr) => curr.filter((n) => n.id !== nodeId));
      setEdges((curr) =>
        curr.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      fetch(`/api/nodes/${nodeId}`, { method: "DELETE" });
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [selectedNodeId]
  );

  const handlePublish = useCallback(async () => {
    if (!agent) return;
    setPublishing(true);
    setError(null);
    const endpoint = agent.is_published
      ? `/api/agents/${agentId}/unpublish`
      : `/api/agents/${agentId}/publish`;
    const res = await fetch(endpoint, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setPublishing(false);
    if (!res.ok) {
      setError(body?.error || "Publish failed");
      return;
    }
    if (agent.is_published) {
      setAgent({ ...agent, is_published: false });
      setPublishUrl(null);
    } else {
      setAgent({ ...agent, is_published: true, public_slug: body.agent.public_slug });
      setPublishUrl(body.url);
    }
  }, [agent, agentId]);

  const handleChatSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const message = chatInput.trim();
      if (!message || chatBusy) return;
      setChatBusy(true);
      const nextHistory: ChatTurn[] = [
        ...chatHistory,
        { role: "user", content: message },
      ];
      setChatHistory(nextHistory);
      setChatInput("");
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history: chatHistory }),
      });
      const body = await res.json().catch(() => ({}));
      setChatBusy(false);
      if (!res.ok) {
        setChatHistory([
          ...nextHistory,
          { role: "assistant", content: `(error) ${body?.error ?? "chat failed"}` },
        ]);
        return;
      }
      setChatHistory([
        ...nextHistory,
        { role: "assistant", content: body.reply ?? "(no reply)" },
      ]);
    },
    [agentId, chatBusy, chatHistory, chatInput]
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const chatPanel = (
    <div
      className={cn(
        "absolute bottom-4 left-4 z-10 flex w-[340px] flex-col border border-border/70 bg-background/95 text-foreground shadow-lg backdrop-blur",
        chatOpen ? "h-[420px]" : "h-10"
      )}
    >
      <button
        onClick={() => setChatOpen((v) => !v)}
        className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-background/70 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <span className="h-px w-4 bg-primary/60" />
          test chat
        </span>
        <span>{chatOpen ? "–" : "+"}</span>
      </button>
      {chatOpen && (
        <>
          <div className="flex-1 overflow-y-auto p-3 text-[13px]">
            {chatHistory.length === 0 ? (
              <p className="text-muted-foreground">
                Ask your agent a question. It uses your active LLM credential.
              </p>
            ) : (
              chatHistory.map((t, i) => (
                <div key={i} className="mb-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t.role}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{t.content}</div>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={handleChatSend}
            className="flex items-center gap-2 border-t border-border/60 p-2"
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask…"
              className="flex-1 rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[13px] focus:border-primary/70 focus:outline-none"
            />
            <button
              type="submit"
              disabled={chatBusy}
              className="h-9 rounded-none border border-primary/70 bg-primary px-3 text-[12px] text-primary-foreground disabled:opacity-60"
            >
              {chatBusy ? "…" : "Send"}
            </button>
          </form>
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="-m-4 min-h-[calc(100vh-4rem)]">
        <Loading label="loading agent" variant="page" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="-m-4 flex min-h-[calc(100vh-4rem)] items-center justify-center text-[14px] text-muted-foreground">
        Agent not found.
      </div>
    );
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-3">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-medium tracking-tight">
            {agent.name}
          </div>
          <div className="truncate text-[12px] text-muted-foreground">
            {agent.role || "agent"}
            {publishUrl && (
              <>
                {" · "}
                <a
                  className="underline underline-offset-2 hover:text-primary"
                  href={publishUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {publishUrl}
                </a>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setAddMenuOpen((v) => !v)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-none border px-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                addMenuOpen
                  ? "border-primary/70 bg-primary/10 text-primary"
                  : "border-border/70 bg-background/40 text-muted-foreground hover:border-primary/60 hover:text-foreground"
              )}
            >
              <span>+ add node</span>
              <span className="text-[10px]">{addMenuOpen ? "▲" : "▼"}</span>
            </button>
            {addMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setAddMenuOpen(false)}
                />
                <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[220px] border border-border/70 bg-background/95 shadow-lg backdrop-blur">
                  {NODE_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => addNode(opt.value)}
                      className="flex w-full flex-col items-start gap-0.5 border-b border-border/50 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-card/70"
                    >
                      <span className="text-[13px] font-medium tracking-tight">
                        {opt.label}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <Link
            href={`/agent/${agentId}/settings`}
            className="inline-flex h-9 items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            integrations
          </Link>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className={cn(
              "h-9 rounded-none border px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
              agent.is_published
                ? "border-border/70 bg-background/40 text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                : "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {publishing ? "…" : agent.is_published ? "unpublish" : "publish"}
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={agentNodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelectedNodeId(n.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          proOptions={{ hideAttribution: true }}
          fitView
        >
          <Background />
          <MiniMap
            className="!bg-background/70 !border !border-border/60"
            maskColor="rgba(0,0,0,0.4)"
          />
          <Controls />
        </ReactFlow>

        {chatPanel}

        {selectedNode && (
          <NodeInspector
            key={selectedNode.id}
            node={selectedNode}
            agentId={agentId}
            onChange={(patch) => updateNodeData(selectedNode.id, patch)}
            onDelete={() => removeNode(selectedNode.id)}
            onClose={() => setSelectedNodeId(null)}
          />
        )}

        {error && (
          <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-none border border-destructive/60 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-destructive/80 hover:text-destructive"
            >
              dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NodeInspector({
  node,
  agentId,
  onChange,
  onDelete,
  onClose,
}: {
  node: Node;
  agentId: string;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const type = (node.type as AgentNodeType) || "text";

  const kindLabel =
    type === "image" ? "image node" : type === "link" ? "link node" : "text node";

  return (
    <aside className="absolute right-0 top-0 z-20 flex h-full w-[340px] flex-col border-l border-border/70 bg-background/95 text-foreground shadow-xl backdrop-blur">
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-px w-4 bg-primary/60" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            {kindLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          close
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <LabeledField label="Label">
          <input
            value={String(data.label ?? "")}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Short title"
            className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[14px] focus:border-primary/70 focus:outline-none"
          />
        </LabeledField>

        {type === "text" && (
          <LabeledField label="Content">
            <textarea
              value={String(data.content ?? "")}
              onChange={(e) => onChange({ content: e.target.value })}
              rows={10}
              placeholder="Knowledge the agent should use…"
              className="w-full resize-y rounded-none border border-border/70 bg-background/40 px-3 py-2 font-mono text-[12.5px] leading-relaxed focus:border-primary/70 focus:outline-none"
            />
          </LabeledField>
        )}

        {type === "image" && (
          <ImageFields
            agentId={agentId}
            imageUrl={(data.imageUrl as string) || ""}
            imagePath={(data.imagePath as string) || ""}
            alt={(data.alt as string) || ""}
            caption={(data.caption as string) || ""}
            onChange={onChange}
          />
        )}

        {type === "link" && (
          <>
            <LabeledField label="URL">
              <input
                value={String(data.url ?? "")}
                onChange={(e) => onChange({ url: e.target.value })}
                placeholder="https://…"
                className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2 font-mono text-[13px] focus:border-primary/70 focus:outline-none"
              />
            </LabeledField>
            <LabeledField label="Description">
              <textarea
                value={String(data.description ?? "")}
                onChange={(e) => onChange({ description: e.target.value })}
                rows={5}
                placeholder="Why this link matters to the agent…"
                className="w-full resize-y rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[13.5px] leading-relaxed focus:border-primary/70 focus:outline-none"
              />
            </LabeledField>
          </>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-border/60 px-5 py-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
          autosaved
        </div>
        <button
          onClick={onDelete}
          className="inline-flex h-8 items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
        >
          delete node
        </button>
      </footer>
    </aside>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-5 block">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

function ImageFields({
  agentId,
  imageUrl,
  imagePath,
  alt,
  caption,
  onChange,
}: {
  agentId: string;
  imageUrl: string;
  imagePath: string;
  alt: string;
  caption: string;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (file: File) => {
      setUploadError(null);
      if (!isAcceptedImage(file)) {
        setUploadError("Unsupported image type.");
        return;
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setUploadError(`Too large (max ${MAX_IMAGE_MB}MB).`);
        return;
      }
      setUploading(true);
      try {
        if (imagePath) {
          deleteNodeAsset(imagePath).catch(() => {});
        }
        const res = await uploadNodeAsset(file, agentId);
        onChange({
          imageUrl: res.url,
          imagePath: res.path,
          mime: res.mime,
        });
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "upload failed");
      } finally {
        setUploading(false);
      }
    },
    [agentId, imagePath, onChange]
  );

  const clearImage = useCallback(() => {
    if (imagePath) deleteNodeAsset(imagePath).catch(() => {});
    onChange({ imageUrl: "", imagePath: "", mime: "" });
  }, [imagePath, onChange]);

  return (
    <>
      <LabeledField label="Image">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFiles(f);
          }}
          className="border border-dashed border-border/70 bg-background/30"
        >
          {imageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={alt}
                className="block max-h-[200px] w-full object-contain bg-background/60"
              />
              <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
                >
                  {uploading ? "uploading…" : "replace"}
                </button>
                <button
                  onClick={clearImage}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive"
                >
                  remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center justify-center gap-1 px-4 py-10 text-center"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {uploading ? "uploading…" : "click or drop to upload"}
              </span>
              <span className="text-[11px] text-muted-foreground/70">
                png · jpg · webp · gif · svg · max {MAX_IMAGE_MB}MB
              </span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFiles(f);
              e.target.value = "";
            }}
            className="hidden"
          />
        </div>
        {uploadError && (
          <div className="mt-1 font-mono text-[11px] text-destructive">
            {uploadError}
          </div>
        )}
      </LabeledField>

      <LabeledField label="Alt text">
        <input
          value={alt}
          onChange={(e) => onChange({ alt: e.target.value })}
          placeholder="Accessibility description"
          className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[13.5px] focus:border-primary/70 focus:outline-none"
        />
      </LabeledField>

      <LabeledField label="Caption">
        <textarea
          value={caption}
          onChange={(e) => onChange({ caption: e.target.value })}
          rows={4}
          placeholder="Context the agent should know about this image"
          className="w-full resize-y rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[13.5px] leading-relaxed focus:border-primary/70 focus:outline-none"
        />
      </LabeledField>

      {imagePath && (
        <div className="truncate font-mono text-[10px] text-muted-foreground/70">
          file · {imagePath.split("/").pop()}
        </div>
      )}
    </>
  );
}

export default function AgentPage() {
  return (
    <ReactFlowProvider>
      <AgentCanvas />
    </ReactFlowProvider>
  );
}
