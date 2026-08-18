/**
 * SEC-015 — server-side upload validation.
 *
 * The previous check OR'd the MIME type against the file extension, so either
 * one alone could admit a file: `evil.png` sent as `text/html` passed on the
 * extension, and the extension actually stored came from
 * `path.extname(file.name)` — user input. The content type recorded in the
 * resulting `data:` URL was the client's `file.type` verbatim, so a payload
 * could be stored under an image extension and later served as HTML.
 *
 * Here the MIME type and the extension must BOTH match the same allowlist
 * entry, and everything written afterwards — the stored extension and the
 * stored content type — is taken from that entry rather than from the request.
 */

export type UploadCategory = "pdf" | "image" | "video";

type AllowedType = {
  /** The only content type stored for this entry. Never the client's. */
  mime: string;
  /** Accepted extensions; the first is canonical and is what gets stored. */
  extensions: string[];
  category: UploadCategory;
};

const ALLOWED_TYPES: AllowedType[] = [
  { mime: "application/pdf", extensions: [".pdf"], category: "pdf" },
  { mime: "image/png", extensions: [".png"], category: "image" },
  { mime: "image/jpeg", extensions: [".jpg", ".jpeg"], category: "image" },
  { mime: "image/webp", extensions: [".webp"], category: "image" },
  { mime: "image/gif", extensions: [".gif"], category: "image" },
  { mime: "video/mp4", extensions: [".mp4"], category: "video" },
  { mime: "video/webm", extensions: [".webm"], category: "video" },
  { mime: "video/ogg", extensions: [".ogv", ".ogg"], category: "video" },
  { mime: "video/quicktime", extensions: [".mov"], category: "video" },
];

/** SEC-015 — SVG is active content: rendered inline it runs script in our origin. */
const SVG_MIME = "image/svg+xml";
const SVG_EXTENSION = /\.svg$/i;
const SVG_ERROR = "SVG uploads are not supported. Use PNG, JPEG, WebP or GIF.";

export const MAX_SIZES: Record<UploadCategory, number> = {
  video: 20 * 1024 * 1024,
  image: 5 * 1024 * 1024,
  pdf: 5 * 1024 * 1024,
};

export type UploadValidation =
  | { ok: true; category: UploadCategory; contentType: string; extension: string; maxSize: number }
  | { ok: false; error: string; status: 400 };

const reject = (error: string): UploadValidation => ({ ok: false, error, status: 400 });

/** The extension as the client presented it, lowercased. Never used as a path. */
function clientExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/**
 * Validates a file's declared type against the allowlist. Size is checked by
 * the caller against `maxSize`, so the real byte length can be used rather
 * than the client's claim.
 */
export function validateUpload(file: { type: string; name: string }): UploadValidation {
  const mime = (file.type || "").toLowerCase().split(";")[0].trim();
  const extension = clientExtension(file.name || "");

  // Rejected before the allowlist so the reason is specific, and by both
  // signals independently — either alone can be spoofed by the client.
  if (mime === SVG_MIME || SVG_EXTENSION.test(file.name || "")) {
    return reject(SVG_ERROR);
  }

  const byMime = ALLOWED_TYPES.find((t) => t.mime === mime);
  if (!byMime) {
    return reject("Unsupported file type. Allowed: PDF, PNG, JPEG, WebP, GIF, MP4, WebM, OGG, MOV.");
  }

  if (!extension) {
    return reject("File must have an extension matching its type.");
  }

  if (!byMime.extensions.includes(extension)) {
    return reject(`File extension ${extension} does not match its content type ${mime}.`);
  }

  return {
    ok: true,
    category: byMime.category,
    // Stored values come from the allowlist entry, never from the request.
    contentType: byMime.mime,
    extension: byMime.extensions[0],
    maxSize: MAX_SIZES[byMime.category],
  };
}

/**
 * The object key. The extension is the validated canonical one, and the only
 * caller-derived component — the user id — is stripped of anything that is not
 * an id character, so no request can steer the write outside the upload dir.
 */
export function buildUploadFilename(userId: string, uniqueId: string, extension: string): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeUnique = uniqueId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `upload-${safeUser}-${safeUnique}${extension}`;
}

/**
 * Content type for serving a stored file. Legacy `data:` URLs carry whatever
 * MIME the old upload path recorded, so anything outside the allowlist is
 * downgraded to a non-rendering type rather than echoed back.
 */
export function safeContentType(mime: string | null | undefined): string {
  const normalised = (mime || "").toLowerCase().split(";")[0].trim();
  return ALLOWED_TYPES.some((t) => t.mime === normalised) ? normalised : "application/octet-stream";
}
