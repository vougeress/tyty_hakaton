import { getTripPhotos, uploadPhoto } from "@/lib/memories/service";
import type { PhotoRecord } from "@/lib/memories/types";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ tripId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  const { tripId } = await context.params;
  const url = new URL(request.url);
  const photos = await getTripPhotos(tripId, {
    authorId: url.searchParams.get("authorId") ?? undefined,
    day: url.searchParams.get("day") ?? undefined,
    eventId: url.searchParams.get("eventId") ?? undefined
  });

  return Response.json({
    tripId,
    photos: photos.map(toPublicPhoto)
  });
}

export async function POST(request: Request, context: RouteParams) {
  const { tripId } = await context.params;
  const form = await request.formData();
  const files = form.getAll("photos").filter((value): value is File => value instanceof File);
  const authorId = stringField(form, "authorId");
  const authorName = stringField(form, "authorName");
  const takenAt = stringField(form, "takenAt");

  if (files.length === 0) {
    return Response.json({ error: "Expected multipart field `photos` with at least one image file." }, { status: 400 });
  }

  try {
    const photos = await Promise.all(files.map((file) => uploadPhoto({
      tripId,
      file,
      authorId,
      authorName,
      takenAt
    })));

    return Response.json({
      tripId,
      photos: photos.map(toPublicPhoto)
    }, { status: 201 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Photo upload failed."
    }, { status: 400 });
  }
}

function stringField(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toPublicPhoto(photo: PhotoRecord) {
  return {
    id: photo.id,
    tripId: photo.tripId,
    originalFilename: photo.originalFilename,
    contentType: photo.contentType,
    size: photo.size,
    checksumSha256: photo.checksumSha256,
    authorId: photo.authorId,
    authorName: photo.authorName,
    takenAt: photo.takenAt,
    dateSource: photo.dateSource,
    calendarDay: photo.calendarDay,
    eventId: photo.eventId,
    eventTitle: photo.eventTitle,
    createdAt: photo.createdAt,
    originalUrl: `/api/photos/${photo.id}/original`
  };
}
