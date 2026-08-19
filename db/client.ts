import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";

type Database = NodePgDatabase<typeof schema>;

const globalForDatabase = globalThis as typeof globalThis & {
  tutuOknoPool?: Pool;
  tutuOknoDb?: Database;
};

export function getDatabase(): Database {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!globalForDatabase.tutuOknoPool) {
    globalForDatabase.tutuOknoPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  if (!globalForDatabase.tutuOknoDb) {
    globalForDatabase.tutuOknoDb = drizzle(globalForDatabase.tutuOknoPool, { schema });
  }

  return globalForDatabase.tutuOknoDb;
}
