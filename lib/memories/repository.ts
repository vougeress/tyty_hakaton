import type { PhotoListFilters, PhotoRecord } from "./types";
import { allSql, runSql, sqlValue } from "./sqlite";

type PhotoRow = {
  id: string;
  trip_id: string;
  original_filename: string;
  content_type: string;
  storage_path: string;
  size: number;
  checksum_sha256: string;
  taken_at: string | null;
  date_source: PhotoRecord["dateSource"];
  calendar_day: string | null;
  event_id: string | null;
  event_title: string | null;
  created_at: string;
};

export async function insertPhoto(photo: PhotoRecord) {
  await runSql(`
    INSERT INTO photos (
      id, trip_id, original_filename, content_type, storage_path, size, checksum_sha256,
      author_id, author_name, taken_at, date_source, calendar_day, event_id, event_title, created_at
    ) VALUES (
      ${sqlValue(photo.id)},
      ${sqlValue(photo.tripId)},
      ${sqlValue(photo.originalFilename)},
      ${sqlValue(photo.contentType)},
      ${sqlValue(photo.storagePath)},
      ${sqlValue(photo.size)},
      ${sqlValue(photo.checksumSha256)},
      NULL,
      '',
      ${sqlValue(photo.takenAt)},
      ${sqlValue(photo.dateSource)},
      ${sqlValue(photo.calendarDay)},
      ${sqlValue(photo.eventId)},
      ${sqlValue(photo.eventTitle)},
      ${sqlValue(photo.createdAt)}
    );
  `);
}

export async function listPhotos(tripId: string, filters: PhotoListFilters = {}) {
  const where = [`trip_id = ${sqlValue(tripId)}`];
  if (filters.day) {
    where.push(`calendar_day = ${sqlValue(filters.day)}`);
  }
  if (filters.eventId) {
    where.push(`event_id = ${sqlValue(filters.eventId)}`);
  }

  const rows = await allSql<PhotoRow>(`
    SELECT * FROM photos
    WHERE ${where.join(" AND ")}
    ORDER BY COALESCE(taken_at, created_at) ASC, created_at ASC;
  `);

  return rows.map(mapPhotoRow);
}

export async function getPhoto(photoId: string) {
  const rows = await allSql<PhotoRow>(`
    SELECT * FROM photos
    WHERE id = ${sqlValue(photoId)}
    LIMIT 1;
  `);

  return rows[0] ? mapPhotoRow(rows[0]) : null;
}

function mapPhotoRow(row: PhotoRow): PhotoRecord {
  return {
    id: row.id,
    tripId: row.trip_id,
    originalFilename: row.original_filename,
    contentType: row.content_type,
    storagePath: row.storage_path,
    size: row.size,
    checksumSha256: row.checksum_sha256,
    takenAt: row.taken_at,
    dateSource: row.date_source,
    calendarDay: row.calendar_day,
    eventId: row.event_id,
    eventTitle: row.event_title,
    createdAt: row.created_at
  };
}
