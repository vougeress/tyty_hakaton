import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderAlbumHtml } from "@/lib/memories/album-html";
import { getTripPhotos } from "@/lib/memories/service";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ tripId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  const { tripId } = await context.params;
  const photos = await getTripPhotos(tripId);
  const origin = new URL(request.url).origin;
  const coverImageUrl = await readAlbumCoverDataUrl();
  const html = renderAlbumHtml(tripId, photos, { assetBaseUrl: origin, coverImageUrl });
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  let pdf: Buffer;
  try {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    await page.emulateMedia({ media: "print" });
    await page.setContent(html, { waitUntil: "networkidle" });
    pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" }
    });
  } finally {
    await browser.close();
  }

  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(pdf.byteLength),
      "content-disposition": `attachment; filename="${encodeURIComponent(`${tripId}-album.pdf`)}"`
    }
  });
}

async function readAlbumCoverDataUrl() {
  const coverPath = path.join(process.cwd(), "data", "album", "album_cover.png");
  const cover = await readFile(coverPath);
  return `data:image/png;base64,${cover.toString("base64")}`;
}
