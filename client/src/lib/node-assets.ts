import { supabase } from "./supabase";

const BUCKET = "project-data-assets";

export const MAX_IMAGE_MB = 8;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

export type NodeAssetUpload = {
  url: string;
  path: string;
  name: string;
  size: number;
  mime: string;
};

function sanitizeExt(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "bin";
  return ext.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
}

export async function uploadNodeAsset(
  file: File,
  projectId: string,
  dataSourceId: string
): Promise<NodeAssetUpload> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("not signed in");
  const userId = userRes.user.id;

  const ext = sanitizeExt(file.name);
  const key = `${userId}/${projectId}/${dataSourceId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });
  if (error) throw new Error(`upload failed: ${error.message}`);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return {
    url: pub.publicUrl,
    path: key,
    name: file.name,
    size: file.size,
    mime: file.type || "application/octet-stream",
  };
}

export async function uploadDataAsset(
  file: File,
  projectId: string,
  dataSourceId: string,
  opts?: { ext?: string }
): Promise<NodeAssetUpload> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("not signed in");
  const userId = userRes.user.id;

  const ext = opts?.ext ?? sanitizeExt(file.name);
  const key = `${userId}/${projectId}/${dataSourceId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });
  if (error) throw new Error(`upload failed: ${error.message}`);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return {
    url: pub.publicUrl,
    path: key,
    name: file.name,
    size: file.size,
    mime: file.type || "application/octet-stream",
  };
}

export async function deleteNodeAsset(path: string): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`delete failed: ${error.message}`);
}

export function isAcceptedImage(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const v = bytes / Math.pow(1024, i);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
