import { NextResponse } from "next/server";
import { requireUser, isAuthResponse } from "@/lib/auth";

const KINDS = new Set(["doc", "nodegraph", "csv", "pdf"]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase } = ctx;
  const { id: projectId } = await params;

  const { data, error } = await supabase
    .from("data_sources")
    .select("id, kind, name, data, position, created_at, updated_at")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dataSources: data });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireUser();
  if (isAuthResponse(ctx)) return ctx;
  const { supabase, user } = ctx;
  const { id: projectId } = await params;

  const body = await req.json().catch(() => ({}));
  const kind = String(body?.kind ?? "");
  if (!KINDS.has(kind))
    return NextResponse.json(
      { error: "kind must be doc, nodegraph, or csv" },
      { status: 400 }
    );
  const name = String(body?.name ?? "").trim() || defaultName(kind);
  const data = body?.data && typeof body.data === "object" ? body.data : defaultData(kind);

  const { data: row, error } = await supabase
    .from("data_sources")
    .insert({
      project_id: projectId,
      user_id: user.id,
      kind,
      name,
      data,
      position: typeof body?.position === "number" ? body.position : 0,
    })
    .select("id, kind, name, data, position, created_at, updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dataSource: row }, { status: 201 });
}

function defaultName(kind: string): string {
  if (kind === "doc") return "Untitled doc";
  if (kind === "nodegraph") return "Untitled graph";
  if (kind === "csv") return "Untitled csv";
  if (kind === "pdf") return "Untitled pdf";
  return "Untitled";
}

function defaultData(kind: string): Record<string, unknown> {
  if (kind === "doc") return { blocks: [] };
  if (kind === "csv") return { filename: "", columns: [], rows: [] };
  if (kind === "pdf")
    return { filename: "", storage_path: "", size: 0, page_count: 0 };
  return {};
}
