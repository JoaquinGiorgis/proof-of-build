import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * The Postgres connection (Supabase).
 *
 * A module-level pool, because a serverless function may be reused across
 * invocations and opening a connection per request exhausts the pooler.
 * `DATABASE_URL` is the Supabase pooled (transaction-mode) connection string.
 */

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (db) return db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Provision Supabase and copy the pooled connection string into .env.local.",
    );
  }

  pool ??= new Pool({
    connectionString: url,
    max: 4,
    // Supabase terminates idle clients; keep the pool honest about it.
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Supavisor terminates TLS with a certificate Node's default trust store
    // does not chain to. The connection is still encrypted; we just do not
    // verify the chain. To verify it, download Supabase's CA and pass it here.
    ssl: { rejectUnauthorized: false },
  });
  db = drizzle(pool, { schema });
  return db;
}

export { schema };
