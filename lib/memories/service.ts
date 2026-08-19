import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { bindPhotoToCalendar } from "./calendar";
import { extractTakenAtFromJpeg, normalizeManualTakenAt } from "./exif";
import { uploadedPhotoPath } from "./paths";
import { insertPhoto, listPhotos } from "./repository";
import type { PhotoListFilters, PhotoRecord, UploadPhotoInput } from "./types";

const supportedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadPhoto(input: UploadPhotoInput): Promise<PhotoRecord> {
  if (!supportedContentTypes.has(input.file.type)) {
    throw new Error(`Unsupported photo content type: ${input.file.type || "unknown"}`);
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const id = randomUUID();
  const extension = extensionFor(input.file.name, input.file.type);
  const storagePath = uploadedPhotoPath(input.tripId, id, extension);
  const manualDate = normalizeManualTakenAt(input.takenAt);
  const exifDate = input.file.type === "image/jpeg" ? extractTakenAtFromJpeg(buffer) : null;
  const date = manualDate ?? exifDate ?? { takenAt: null, source: "unknown" as const };
  const calendarBinding = bindPhotoToCalendar(input.tripId, date.takenAt);
  const createdAt = new Date().toISOString();

  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(storagePath, buffer);

  const photo: PhotoRecord = {
    id,
    tripId: input.tripId,
    originalFilename: input.file.name || `${id}${extension}`,
    contentType: input.file.type,
    storagePath,
    size: buffer.byteLength,
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    authorId: input.authorId?.trim() || null,
    authorName: input.authorName?.trim() || "Неизвестный автор",
    takenAt: date.takenAt,
    dateSource: date.source,
    ...calendarBinding,
    createdAt
  };

  await insertPhoto(photo);
  return photo;
}

export async function getTripPhotos(tripId: string, filters: PhotoListFilters = {}) {
  return listPhotos(tripId, filters);
}

function extensionFor(filename: string, contentType: string) {
  const extension = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  if (contentType === "image/png") {
    return ".png";
  }
  if (contentType === "image/webp") {
    return ".webp";
  }

  return ".jpg";
}
