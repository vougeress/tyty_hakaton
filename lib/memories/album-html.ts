import { buildAlbumDocument } from "./album-template";
import type { PhotoRecord } from "./types";

type AlbumHtmlOptions = {
  assetBaseUrl?: string;
  coverImageUrl?: string;
};

export function renderAlbumHtml(tripId: string, photos: PhotoRecord[], options: AlbumHtmlOptions = {}) {
  const album = buildAlbumDocument(tripId, photos);

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(album.title)} · Альбом</title>
  <style>
    :root {
      --ink: #17133f;
      --primary: #6f5df6;
      --accent: #d1ff1a;
      --cyan: #6dd8df;
      --coral: #ff776d;
      --paper: #fffdf8;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background: #ecebf5;
      color: var(--ink);
      font-family: Inter, Arial, sans-serif;
    }

    .album {
      display: grid;
      gap: 24px;
      justify-content: center;
      padding: 24px;
    }

    .page {
      position: relative;
      width: 794px;
      height: 1123px;
      overflow: hidden;
      background: var(--paper);
      border-radius: 18px;
      box-shadow: 0 18px 55px rgba(23, 19, 63, 0.18);
      page-break-after: always;
    }

    .page::before {
      content: "";
      position: absolute;
      inset: 0;
      border: 18px solid var(--primary);
      border-right-color: var(--cyan);
      border-bottom-color: var(--accent);
      border-left-color: var(--coral);
      pointer-events: none;
      z-index: 3;
    }

    .cover-page::before {
      content: none;
    }

    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .header {
      position: absolute;
      top: 34px;
      left: 50px;
      right: 50px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      z-index: 4;
    }

    .logo {
      flex: 0 0 auto;
      font-size: 34px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: 0;
    }

    .logo span {
      display: inline-block;
      color: var(--primary);
      transform: skew(-8deg);
    }

    .meta {
      min-width: 0;
      text-align: right;
    }

    .title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 22px;
      font-weight: 800;
    }

    .subtitle {
      margin-top: 3px;
      color: rgba(23, 19, 63, 0.55);
      font-size: 13px;
      font-weight: 700;
    }

    .slot {
      position: absolute;
      overflow: hidden;
      border-radius: 0;
      background: #f0eefb;
      box-shadow: none;
    }

    .slot img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .empty {
      position: absolute;
      inset: 150px 70px 70px;
      display: grid;
      place-items: center;
      border: 3px dashed rgba(111, 93, 246, 0.35);
      border-radius: 24px;
      color: rgba(23, 19, 63, 0.45);
      font-size: 28px;
      font-weight: 800;
    }

    .footer {
      position: absolute;
      left: 52px;
      right: 52px;
      bottom: 34px;
      display: flex;
      justify-content: space-between;
      color: rgba(23, 19, 63, 0.48);
      font-size: 12px;
      font-weight: 800;
    }

    @media print {
      body { background: white; }
      .album { padding: 0; gap: 0; }
      .page {
        width: 210mm;
        height: 297mm;
        border-radius: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <main class="album">
    ${options.coverImageUrl ? `
      <section class="page cover-page">
        <img class="cover-image" src="${options.coverImageUrl}" alt="${escapeHtml(album.title)}" />
      </section>
    ` : ""}
    ${album.pages.map((page) => `
      <section class="page" data-layout="${page.layout.id}">
        <div class="header">
          <div class="logo">tu<span>tu</span></div>
          ${page.title ? `
            <div class="meta">
              <div class="title">${escapeHtml(page.title)}</div>
            </div>
          ` : ""}
        </div>
        ${page.photos.length === 0 ? `<div class="empty">Добавьте фотографии</div>` : ""}
        ${page.photos.map((photo, index) => {
          const slot = page.layout.slots[index];
          if (!slot) return "";
          const photoUrl = photoOriginalUrl(photo.id, options.assetBaseUrl);
          return `
            <a class="slot" href="${photoUrl}" title="${escapeHtml(photo.originalFilename)}" style="left:${slot.x}%;top:${slot.y}%;width:${slot.w}%;height:${slot.h}%">
              <img src="${photoUrl}" alt="${escapeHtml(photo.originalFilename)}" />
            </a>
          `;
        }).join("")}
        <div class="footer">
          <span>${escapeHtml(album.title)}</span>
          <span>${page.index + coverPageOffset(options)}/${album.pageCount + coverPageOffset(options)}</span>
        </div>
      </section>
    `).join("")}
  </main>
</body>
</html>`;
}

function coverPageOffset(options: AlbumHtmlOptions) {
  return options.coverImageUrl ? 1 : 0;
}

function photoOriginalUrl(photoId: string, assetBaseUrl?: string) {
  const path = `/api/photos/${encodeURIComponent(photoId)}/original`;
  if (!assetBaseUrl) {
    return path;
  }

  return `${assetBaseUrl.replace(/\/$/, "")}${path}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
