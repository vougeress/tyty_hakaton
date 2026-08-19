import { generateAlbumPdf } from "@/lib/memories/album-pdf";
import { getTripPhotos } from "@/lib/memories/service";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ tripId: string }>;
};

export async function GET(_request: Request, context: RouteParams) {
  const { tripId } = await context.params;
  const photos = await getTripPhotos(tripId);
  const pdf = generateAlbumPdf(tripId, photos);

  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(pdf.byteLength),
      "content-disposition": `attachment; filename="${encodeURIComponent(`${tripId}-album.pdf`)}"`
    }
  });
}
