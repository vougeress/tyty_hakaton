import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getPhoto } from "@/lib/memories/repository";
import { legacyUploadsRoot, mediaRoot } from "@/lib/memories/paths";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ photoId: string }>;
};

export async function GET(_request: Request, context: RouteParams) {
  const { photoId } = await context.params;
  const photo = await getPhoto(photoId);
  if (!photo) {
    return Response.json({ error: "Photo not found." }, { status: 404 });
  }

  try {
    const storagePath = await assertReadableStoragePath(photo.storagePath);
    const fileStat = await stat(storagePath);
    const stream = Readable.toWeb(createReadStream(storagePath)) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        "content-type": photo.contentType,
        "content-length": String(fileStat.size),
        "content-disposition": `inline; filename="${encodeURIComponent(photo.originalFilename)}"`
      }
    });
  } catch {
    return Response.json({ error: "Photo file is missing from local storage." }, { status: 410 });
  }
}

async function assertReadableStoragePath(storagePath: string) {
  const [resolvedStoragePath, resolvedMediaRoot, resolvedLegacyUploadsRoot] = await Promise.all([
    realpath(storagePath),
    realpath(mediaRoot).catch(() => mediaRoot),
    realpath(legacyUploadsRoot).catch(() => legacyUploadsRoot)
  ]);

  if (isInside(resolvedStoragePath, resolvedMediaRoot) || isInside(resolvedStoragePath, resolvedLegacyUploadsRoot)) {
    return resolvedStoragePath;
  }

  throw new Error("Photo storage path is outside allowed roots.");
}

function isInside(filePath: string, root: string) {
  const relativePath = path.relative(root, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}
