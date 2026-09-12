import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read `.env.local` the way Next.js does, so load it here.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {
  // No .env.local — fall back to whatever is already in the environment.
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Session-mode pooler (5432). The transaction pooler on 6543 does not hold
    // a session across statements, which DDL and advisory locks need.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
