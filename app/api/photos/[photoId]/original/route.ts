import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getPhoto } from "@/lib/memories/repository";

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
    const fileStat = await stat(photo.storagePath);
    const stream = Readable.toWeb(createReadStream(photo.storagePath)) as ReadableStream<Uint8Array>;
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
