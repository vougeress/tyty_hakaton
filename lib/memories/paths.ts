import path from "node:path";

export const dataRoot = path.join(process.cwd(), "data");
export const uploadsRoot = path.join(dataRoot, "uploads");
export const dbRoot = path.join(dataRoot, "db");
export const memoriesDbPath = path.join(dbRoot, "memories.sqlite");

export function tripUploadsDir(tripId: string) {
  return path.join(uploadsRoot, safePathPart(tripId));
}

export function uploadedPhotoPath(tripId: string, photoId: string, extension: string) {
  return path.join(tripUploadsDir(tripId), `${safePathPart(photoId)}${extension}`);
}

export function safePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "unknown";
}
