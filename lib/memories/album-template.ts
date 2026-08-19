import { selectAlbumLayout, type AlbumLayout } from "./album-layouts";
import type { PhotoRecord } from "./types";

export type AlbumPage = {
  index: number;
  title: string;
  subtitle: string;
  layout: AlbumLayout;
  photos: PhotoRecord[];
};

export type AlbumDocument = {
  tripId: string;
  title: string;
  subtitle: string;
  pageCount: number;
  photoCount: number;
  pages: AlbumPage[];
};

const maxPhotosPerPage = 4;

export function buildAlbumDocument(tripId: string, photos: PhotoRecord[]): AlbumDocument {
  const albumPhotos = photos.filter(isPrintableAlbumPhoto);
  const shuffledPhotos = seededShuffle(albumPhotos, tripId);
  const pages: AlbumPage[] = [];

  for (let offset = 0; offset < shuffledPhotos.length; offset += maxPhotosPerPage) {
    const pagePhotos = shuffledPhotos.slice(offset, offset + maxPhotosPerPage);
    const layout = selectAlbumLayout(pagePhotos.length);
    const title = pageTitle(pagePhotos);

    pages.push({
      index: pages.length + 1,
      title,
      subtitle: `${pagePhotos.length} фото`,
      layout,
      photos: pagePhotos
    });
  }

  if (pages.length === 0) {
    pages.push({
      index: 1,
      title: "Альбом пока пуст",
      subtitle: "Добавьте фотографии в поездку",
      layout: selectAlbumLayout(1),
      photos: []
    });
  }

  return {
    tripId,
    title: "Казань",
    subtitle: `${albumPhotos.length} фото · ${pages.length} стр.`,
    pageCount: pages.length,
    photoCount: albumPhotos.length,
    pages
  };
}

function isPrintableAlbumPhoto(photo: PhotoRecord) {
  return photo.size > 1024;
}

function pageTitle(photos: PhotoRecord[]) {
  const eventTitle = photos.find((photo) => photo.eventTitle && photo.eventTitle !== "Без даты")?.eventTitle;
  if (eventTitle) {
    return eventTitle;
  }

  const day = photos.find((photo) => photo.calendarDay)?.calendarDay;
  if (day) {
    return formatDay(day);
  }

  return "";
}

function formatDay(day: string) {
  const date = new Date(`${day}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) {
    return day;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow"
  }).format(date);
}

function seededShuffle<T>(items: T[], seed: string) {
  const result = [...items];
  const random = mulberry32(hashSeed(seed));

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
