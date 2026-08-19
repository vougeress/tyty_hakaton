import path from "node:path";

export const dataRoot = path.join(process.cwd(), "data");
export const mediaRoot = path.join(dataRoot, "media");
export const photosRoot = path.join(mediaRoot, "photos");
export const legacyUploadsRoot = path.join(dataRoot, "uploads");
export const dbRoot = path.join(dataRoot, "db");
export const memoriesDbPath = path.join(dbRoot, "memories.sqlite");

export function tripPhotosDir(tripId: string, createdAt: Date) {
  const year = String(createdAt.getUTCFullYear());
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  return path.join(photosRoot, safePathPart(tripId), year, month);
}

export function storedPhotoPath(tripId: string, photoId: string, originalFilename: string, extension: string, createdAt: Date) {
  return path.join(mediaRoot, storedPhotoKey(tripId, photoId, originalFilename, extension, createdAt));
}

function storedPhotoKey(tripId: string, photoId: string, originalFilename: string, extension: string, createdAt: Date) {
  const basename = path.basename(originalFilename, path.extname(originalFilename));
  const slug = safePathPart(basename).toLowerCase();
  const year = String(createdAt.getUTCFullYear());
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  return ["photos", safePathPart(tripId), year, month, `${safePathPart(photoId)}-${slug}${extension}`].join("/");
}

export function safePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "unknown";
}
