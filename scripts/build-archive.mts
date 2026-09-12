/**
 * Archives a build, or brings one back.
 *
 *   pnpm build:archive <slug>
 *   pnpm build:archive <slug> --restore
 *
 * Archiving takes a project out of every listing and closes it to new claims.
 * It does not delete anything, and it must not: a minted credential's metadata
 * URI names this slug and the mint authority is revoked, so that pointer can
 * never be moved. `/b/<slug>` keeps answering — it just says it is archived,
 * and the credentials already claimed against it stay exactly as valid as they
 * were, because the chain is what makes them valid, not this table.
 */

import { readFileSync } from "node:fs";
import pg from "pg";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const slug = process.argv[2];
const restore = process.argv.includes("--restore");
if (!slug) {
  console.error("usage: pnpm build:archive <slug> [--restore]");
  process.exit(1);
}

const db = new pg.Client({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
await db.connect();

const { rows } = await db.query(
  `update builds set archived_at = ${restore ? "null" : "now()"}
   where slug = $1
   returning slug, name, archived_at`,
  [slug],
);

if (rows.length === 0) {
  console.error(`no build with slug "${slug}"`);
  await db.end();
  process.exit(1);
}

const { rows: credentials } = await db.query(
  "select count(*)::int as n from credentials where build_slug = $1",
  [slug],
);

const [build] = rows;
console.log(`  ${build.name} (${build.slug})`);
console.log(`  ${build.archived_at ? `archived ${build.archived_at.toISOString()}` : "restored — live again"}`);
console.log(`  ${credentials[0].n} credential(s) already minted; untouched, and still at /b/${build.slug}`);

await db.end();
process.exit(0);
