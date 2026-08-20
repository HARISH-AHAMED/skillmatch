import type { Prisma } from "@prisma/client";

/* ============================================================================
   SCALAR ADAPTERS
   Prisma hands back Decimal instances and Date objects. Every domain type in
   `@/lib/types` is a plain number or an ISO string, because those shapes cross
   the server/client boundary and Decimal does not serialise.
   ========================================================================= */

/** Prisma Decimal (or anything numeric-ish) → number. */
export function dec(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value.toString());
}

/** Date → ISO string. */
export function iso(value: Date | string | null | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.toISOString();
}

/** Date → ISO string, preserving "absent" rather than coercing to the epoch. */
export function isoOrUndefined(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.toISOString();
}

/** Null-stripping passthrough for the many optional String? columns. */
export function opt(value: string | null | undefined): string | undefined {
  return value === null || value === undefined || value === "" ? undefined : value;
}

/** Null-collapsing passthrough for fields the UI types declare as required. */
export function str(value: string | null | undefined, fallback = ""): string {
  return value === null || value === undefined ? fallback : value;
}

/** Prisma Json columns are `unknown` in practice — read them defensively. */
export function jsonArray<T>(value: Prisma.JsonValue | null | undefined): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Byte count → the "1.2 MB" strings the file cards render. */
export function fileSizeLabel(raw: string | null | undefined): string {
  if (!raw) return "—";
  const bytes = Number(raw);
  if (!Number.isFinite(bytes)) return raw; // already a label like "1.2 MB"
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Best-effort MIME from a filename, for the file-type icons. */
export function mimeFromName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const table: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    zip: "application/zip",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    csv: "text/csv",
    txt: "text/plain",
    md: "text/markdown",
    mp4: "video/mp4",
    mov: "video/quicktime",
  };
  return table[ext] ?? "application/octet-stream";
}
