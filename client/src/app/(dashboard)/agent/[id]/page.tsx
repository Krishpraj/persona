"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
          type: "default",
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
          // ignore transient failures; user will re-trigger on next drag
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
        }
      }
    },
    [scheduleNodeSave]
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
      setEdges((curr) =>
        addEdge({ ...connection, id }, curr)
      );
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

  const handleAddNode = useCallback(async () => {
    const id = uuid();
    const position = {
      x: 120 + Math.random() * 240,
      y: 120 + Math.random() * 160,
    };
    const data = { label: "Knowledge", content: "" };
    setNodes((curr) => [
      ...curr,
      { id, type: "default", position, data },
    ]);
    await fetch(`/api/agents/${agentId}/nodes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        type: "knowledge",
        position_x: position.x,
        position_y: position.y,
        data,
      }),
    });
  }, [agentId]);

  const handleEditSelected = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const currentLabel = String(node.data?.label ?? "");
      const currentContent = String(node.data?.content ?? "");
      const nextLabel = prompt("Node label", currentLabel) ?? currentLabel;
      const nextContent =
        prompt("Node content (used as knowledge in chat)", currentContent) ??
        currentContent;
      const nextData = { ...node.data, label: nextLabel, content: nextContent };
      setNodes((curr) =>
        curr.map((n) => (n.id === nodeId ? { ...n, data: nextData } : n))
      );
      scheduleNodeSave(nodeId, { data: nextData });
    },
    [nodes, scheduleNodeSave]
  );

  const handlePublish = useCallback(async () => {
    if (!agent) return;
    setPublishing(true);
    setError(null);
    const method = "POST";
    const endpoint = agent.is_published
      ? `/api/agents/${agentId}/unpublish`
      : `/api/agents/${agentId}/publish`;
    const res = await fetch(endpoint, { method });
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

  const chatPanel = useMemo(
    () => (
      <div
        className={cn(
          "absolute right-4 bottom-4 z-10 flex w-[360px] flex-col border border-border/70 bg-background/95 text-foreground shadow-lg backdrop-blur",
          chatOpen ? "h-[440px]" : "h-12"
        )}
      >
        <button
          onClick={() => setChatOpen((v) => !v)}
          className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-background/60 px-4 text-[13px]"
        >
          <span>Test chat</span>
          <span className="text-muted-foreground">{chatOpen ? "–" : "+"}</span>
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
                className="flex-1 border border-border/70 bg-background/40 px-3 py-2 text-[13px] focus:border-primary/70 focus:outline-none"
              />
              <button
                type="submit"
                disabled={chatBusy}
                className="h-9 border border-primary/70 bg-primary px-3 text-[12px] text-primary-foreground disabled:opacity-60"
              >
                {chatBusy ? "…" : "Send"}
              </button>
            </form>
          </>
        )}
      </div>
    ),
    [chatBusy, chatHistory, chatInput, chatOpen, handleChatSend]
  );

  if (loading) {
    return (
      <div className="-m-4 flex min-h-[calc(100vh-4rem)] items-center justify-center text-[14px] text-muted-foreground">
        Loading…
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
        <div>
          <div className="text-[16px] font-medium tracking-tight">{agent.name}</div>
          <div className="text-[12px] text-muted-foreground">
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
          <button
            onClick={handleAddNode}
            className="h-9 border border-border/70 bg-card/60 px-3 text-[12px] hover:bg-card/90"
          >
            + Node
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className={cn(
              "h-9 border px-3 text-[12px] transition-colors",
              agent.is_published
                ? "border-border/70 bg-card/60 hover:bg-card/90"
                : "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {publishing
              ? "…"
              : agent.is_published
              ? "Unpublish"
              : "Publish"}
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={(_, n) => handleEditSelected(n.id)}
          fitView
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
        {chatPanel}
        {error && (
          <div className="absolute left-4 top-4 z-10 border border-destructive/60 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentPage() {
  return (
    <ReactFlowProvider>
      <AgentCanvas />
    </ReactFlowProvider>
  );
}
