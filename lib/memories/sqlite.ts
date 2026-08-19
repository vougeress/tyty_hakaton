import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { dbRoot, memoriesDbPath } from "./paths";

const execFileAsync = promisify(execFile);

export function sqlValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  return `'${value.replaceAll("'", "''")}'`;
}

export async function runSql(sql: string) {
  await ensureDatabase();
  await execFileAsync("sqlite3", ["-batch", "-bail", memoriesDbPath, sql], {
    maxBuffer: 1024 * 1024
  });
}

export async function allSql<T>(sql: string): Promise<T[]> {
  await ensureDatabase();
  const { stdout } = await execFileAsync("sqlite3", ["-json", "-batch", "-bail", memoriesDbPath, sql], {
    maxBuffer: 5 * 1024 * 1024
  });

  const trimmed = stdout.trim();
  return trimmed ? JSON.parse(trimmed) as T[] : [];
}

async function ensureDatabase() {
  await mkdir(dbRoot, { recursive: true });
  await execFileAsync("sqlite3", [
    "-batch",
    "-bail",
    memoriesDbPath,
    `
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        content_type TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        size INTEGER NOT NULL,
        checksum_sha256 TEXT NOT NULL,
        author_id TEXT,
        author_name TEXT NOT NULL,
        taken_at TEXT,
        date_source TEXT NOT NULL,
        calendar_day TEXT,
        event_id TEXT,
        event_title TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_photos_trip_created ON photos(trip_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_photos_trip_author ON photos(trip_id, author_id);
      CREATE INDEX IF NOT EXISTS idx_photos_trip_day ON photos(trip_id, calendar_day);
      CREATE INDEX IF NOT EXISTS idx_photos_trip_event ON photos(trip_id, event_id);
    `
  ], {
    maxBuffer: 1024 * 1024
  });
}
