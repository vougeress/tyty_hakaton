import type { PhotoRecord } from "./types";
import { buildAlbumDocument } from "./album-template";

type PdfObject = {
  id: number;
  body: string;
};

export function generateAlbumPdf(tripId: string, photos: PhotoRecord[]) {
  const pages = buildAlbumPages(tripId, photos);
  const objects: PdfObject[] = [];
  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  let nextId = 4;
  const pageIds: number[] = [];

  for (const pageLines of pages) {
    const contentId = nextId;
    nextId += 1;
    const pageId = nextId;
    nextId += 1;
    pageIds.push(pageId);

    const stream = renderTextPage(pageLines);
    objects.push({
      id: contentId,
      body: `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`
    });
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    });
  }

  objects.unshift(
    { id: catalogId, body: `<< /Type /Catalog /Pages ${pagesId} 0 R >>` },
    { id: pagesId, body: `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>` },
    { id: fontId, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" }
  );

  return Buffer.from(writePdf(objects, catalogId), "binary");
}

function buildAlbumPages(tripId: string, photos: PhotoRecord[]) {
  const album = buildAlbumDocument(tripId, photos);

  return album.pages.map((page) => [
    `tutu album: ${album.title}`,
    `${album.photoCount} photos / ${album.pageCount} pages`,
    `page ${page.index}: ${page.title}`,
    `layout: ${page.layout.id} - ${page.layout.title}`,
    ...page.photos.map((photo, index) => `${index + 1}. ${photo.eventTitle ?? photo.calendarDay ?? "no date"} / /api/photos/${photo.id}/original`)
  ]);
}

function renderTextPage(lines: string[]) {
  const escapedLines = lines.flatMap((line) => wrapLine(line, 78)).slice(0, 32);
  const commands = ["BT", "/F1 14 Tf", "50 790 Td"];
  escapedLines.forEach((line, index) => {
    if (index > 0) {
      commands.push("0 -22 Td");
    }
    commands.push(`(${escapePdfText(line)}) Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

function wrapLine(line: string, maxLength: number) {
  if (line.length <= maxLength) {
    return [line];
  }

  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > maxLength) {
    chunks.push(remaining.slice(0, maxLength));
    remaining = remaining.slice(maxLength);
  }
  if (remaining) {
    chunks.push(remaining);
  }
  return chunks;
}

function escapePdfText(value: string) {
  return value.replace(/[\\()]/g, (match) => `\\${match}`).replace(/[^\x20-\x7e]/g, "?");
}

function writePdf(objects: PdfObject[], catalogId: number) {
  const chunks = ["%PDF-1.4\n"];
  const offsets: number[] = [0];
  let length = Buffer.byteLength(chunks[0], "binary");

  for (const object of objects.sort((a, b) => a.id - b.id)) {
    offsets[object.id] = length;
    const chunk = `${object.id} 0 obj\n${object.body}\nendobj\n`;
    chunks.push(chunk);
    length += Buffer.byteLength(chunk, "binary");
  }

  const xrefOffset = length;
  const maxId = Math.max(...objects.map((object) => object.id));
  const xref = [
    "xref",
    `0 ${maxId + 1}`,
    "0000000000 65535 f ",
    ...Array.from({ length: maxId }, (_, index) => {
      const offset = offsets[index + 1] ?? 0;
      return `${String(offset).padStart(10, "0")} 00000 n `;
    }),
    "trailer",
    `<< /Size ${maxId + 1} /Root ${catalogId} 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF"
  ].join("\n");

  return `${chunks.join("")}${xref}\n`;
}
