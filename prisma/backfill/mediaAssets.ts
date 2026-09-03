import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

/* ============================================================================
   BACKFILL — data: URLs out of the row columns and into MediaAsset

   Uploads made before the media store landed were written into text columns as
   `data:<mime>;base64,<...>` and re-serialized into the HTML of every page that
   rendered them. This moves each one into MediaAsset and replaces the column
   value with the /api/media/<id> URL that serves it.

   Safe to run repeatedly: a value that is already a URL is skipped, and the
   asset id is the sha-256 of the bytes, so re-running writes the same row.

   Run with:  npx tsx prisma/backfill/mediaAssets.ts
   Add --dry  to report what would change without writing.
   ========================================================================= */

const db = new PrismaClient();
const DRY = process.argv.includes("--dry");

/** Every text column that can hold an uploaded image. */
const COLUMNS: { table: string; column: string }[] = [
  { table: "User", column: "image" },
  { table: "Company", column: "logoUrl" },
  { table: "Company", column: "bannerUrl" },
  { table: "Freelancer", column: "bannerUrl" },
  { table: "Project", column: "bannerUrl" },
];

const DATA_URL = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,(.+)$/i;

async function storeAsset(dataUrl: string): Promise<string | null> {
  const match = DATA_URL.exec(dataUrl);
  if (!match) return null;

  const [, mimeType, base64] = match;
  const data = Buffer.from(base64, "base64");
  if (data.length === 0) return null;

  const id = crypto.createHash("sha256").update(data).digest("hex");

  if (!DRY) {
    await db.mediaAsset.upsert({
      where: { id },
      update: {},
      create: { id, mimeType, byteSize: data.length, data },
    });
  }

  return `/api/media/${id}`;
}

/** String[] columns whose elements can each be an uploaded image. */
const ARRAY_COLUMNS: { table: string; column: string }[] = [
  { table: "Company", column: "galleryPhotos" },
];

/**
 * Text columns that can carry a data: URL *inside* something else — the
 * serialized metadata block a listing keeps in its description, for instance.
 * Only the data: URL itself is rewritten; the surrounding text is untouched.
 */
const EMBEDDED_COLUMNS: { table: string; column: string }[] = [
  { table: "Project", column: "description" },
  { table: "Company", column: "description" },
  { table: "Freelancer", column: "bio" },
];

/** A data: URL as it appears inside JSON — the closing quote ends it. */
const EMBEDDED = /data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi;

async function main() {
  let moved = 0;
  let bytes = 0;

  for (const { table, column } of COLUMNS) {
    let rows: { id: string; value: string }[];
    try {
      rows = await db.$queryRawUnsafe<{ id: string; value: string }[]>(
        `SELECT "id", "${column}" AS "value" FROM "${table}" WHERE "${column}" LIKE 'data:%'`,
      );
    } catch {
      // A column that does not exist in this schema version is simply skipped
      // rather than failing the whole backfill.
      console.log(`skip  ${table}.${column} (no such column)`);
      continue;
    }

    for (const row of rows) {
      const url = await storeAsset(row.value);
      if (!url) continue;

      bytes += row.value.length;
      moved += 1;

      if (!DRY) {
        await db.$executeRawUnsafe(
          `UPDATE "${table}" SET "${column}" = $1 WHERE "id" = $2`,
          url,
          row.id,
        );
      }
      console.log(`${DRY ? "would move" : "moved"}  ${table}.${column}  ${row.id}  ${(row.value.length / 1024) | 0}KB -> ${url}`);
    }
  }

  for (const { table, column } of ARRAY_COLUMNS) {
    const rows = await db.$queryRawUnsafe<{ id: string; value: string[] }[]>(
      `SELECT "id", "${column}" AS "value" FROM "${table}" WHERE array_to_string("${column}", '') LIKE '%data:%'`,
    );

    for (const row of rows) {
      const next: string[] = [];
      let changed = false;

      for (const entry of row.value) {
        const url = await storeAsset(entry);
        if (!url) {
          next.push(entry);
          continue;
        }
        bytes += entry.length;
        moved += 1;
        changed = true;
        next.push(url);
      }

      if (!changed) continue;
      if (!DRY) {
        await db.$executeRawUnsafe(`UPDATE "${table}" SET "${column}" = $1 WHERE "id" = $2`, next, row.id);
      }
      console.log(`${DRY ? "would move" : "moved"}  ${table}.${column}  ${row.id}  ${next.length} entries`);
    }
  }

  for (const { table, column } of EMBEDDED_COLUMNS) {
    const rows = await db.$queryRawUnsafe<{ id: string; value: string }[]>(
      `SELECT "id", "${column}" AS "value" FROM "${table}" WHERE "${column}" LIKE '%data:%'`,
    );

    for (const row of rows) {
      const found = row.value.match(EMBEDDED) ?? [];
      if (found.length === 0) continue;

      let next = row.value;
      for (const dataUrl of found) {
        const url = await storeAsset(dataUrl);
        if (!url) continue;
        bytes += dataUrl.length;
        moved += 1;
        next = next.split(dataUrl).join(url);
      }

      if (next === row.value) continue;
      if (!DRY) {
        await db.$executeRawUnsafe(`UPDATE "${table}" SET "${column}" = $1 WHERE "id" = $2`, next, row.id);
      }
      console.log(
        `${DRY ? "would move" : "moved"}  ${table}.${column}  ${row.id}  ${found.length} embedded image(s)`,
      );
    }
  }

  console.log(
    `\n${DRY ? "Would move" : "Moved"} ${moved} image(s), ${(bytes / 1024) | 0}KB of base64 out of row columns.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
