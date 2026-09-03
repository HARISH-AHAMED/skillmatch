import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateUpload,
  buildUploadFilename,
  safeContentType,
  MAX_SIZES,
} from "@/lib/uploads";
import { createDbMock, sessionState, setSession, signedOut, COMPANY_A, FREELANCER_A } from "./helpers/mocks";

const db = createDbMock();
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/auth", () => ({
  auth: async () => (sessionState.user ? { user: sessionState.user } : null),
}));

const { POST } = await import("@/app/api/upload/route");

function upload(file: { name: string; type: string; size?: number; bytes?: Buffer }) {
  const source = file.bytes ?? Buffer.alloc(file.size ?? 8, 1);
  const body = new Uint8Array(source);
  const form = new FormData();
  form.append("file", new File([body], file.name, { type: file.type }));
  return POST(new Request("http://localhost/api/upload", { method: "POST", body: form }) as never);
}

beforeEach(() => {
  signedOut();
  vi.stubEnv("NODE_ENV", "production"); // exercise the media-store branch, no disk writes
});

describe("SEC-015: upload type allowlist", () => {
  it("accepts a valid image whose MIME and extension agree", () => {
    const r = validateUpload({ type: "image/png", name: "logo.png" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.category).toBe("image");
      expect(r.contentType).toBe("image/png");
      expect(r.extension).toBe(".png");
    }
  });

  it("accepts a valid PDF", () => {
    const r = validateUpload({ type: "application/pdf", name: "cv.pdf" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.category).toBe("pdf");
  });

  it("accepts .jpeg and .jpg for image/jpeg but canonicalises the stored extension", () => {
    for (const name of ["a.jpg", "a.jpeg"]) {
      const r = validateUpload({ type: "image/jpeg", name });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.extension).toBe(".jpg");
    }
  });

  it("rejects a MIME/extension mismatch", () => {
    const r = validateUpload({ type: "text/html", name: "payload.png" });
    expect(r.ok).toBe(false);
  });

  it("rejects an allowed MIME carrying a foreign extension", () => {
    const r = validateUpload({ type: "image/png", name: "payload.html" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/does not match/i);
  });

  it("rejects an unsupported extension", () => {
    expect(validateUpload({ type: "application/x-msdownload", name: "a.exe" }).ok).toBe(false);
  });

  it("rejects an unsupported MIME type", () => {
    expect(validateUpload({ type: "text/html", name: "a.html" }).ok).toBe(false);
  });

  it("rejects a file with no extension", () => {
    expect(validateUpload({ type: "image/png", name: "noext" }).ok).toBe(false);
  });

  it("rejects SVG by MIME even under an image extension", () => {
    const r = validateUpload({ type: "image/svg+xml", name: "icon.png" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/SVG uploads are not supported/);
  });

  it("rejects SVG by extension even under an allowed MIME", () => {
    const r = validateUpload({ type: "image/png", name: "icon.svg" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/SVG uploads are not supported/);
  });

  it("applies the documented size limits per category", () => {
    expect(MAX_SIZES.video).toBe(20 * 1024 * 1024);
    expect(MAX_SIZES.image).toBe(5 * 1024 * 1024);
    expect(MAX_SIZES.pdf).toBe(5 * 1024 * 1024);
  });
});

describe("SEC-015: safe object keys", () => {
  it("never lets a user-controlled extension become the stored extension", () => {
    const name = buildUploadFilename("user-1", "uuid-1", ".png");
    expect(name.endsWith(".png")).toBe(true);
    expect(name).not.toMatch(/\.(html|js|svg|exe)/);
  });

  it("strips path and separator characters out of the key", () => {
    const name = buildUploadFilename("../../etc", "a/b\c", ".png");
    expect(name).not.toContain("/");
    expect(name).not.toContain("\\");
    expect(name).not.toContain("..");
    expect(name).toBe("upload-etc-abc.png");
  });
});

describe("SEC-015: stored content type is server-derived", () => {
  it("keeps allowlisted types for stored files", () => {
    expect(safeContentType("image/png")).toBe("image/png");
    expect(safeContentType("application/pdf")).toBe("application/pdf");
  });

  it("downgrades an active type recorded by a legacy upload", () => {
    expect(safeContentType("text/html")).toBe("application/octet-stream");
    expect(safeContentType("image/svg+xml")).toBe("application/octet-stream");
  });

  it("downgrades a missing or malformed type", () => {
    expect(safeContentType(null)).toBe("application/octet-stream");
    expect(safeContentType("")).toBe("application/octet-stream");
  });
});

describe("SEC-015: upload endpoint", () => {
  it("rejects an unauthenticated upload with 401", async () => {
    const res = await upload({ name: "a.png", type: "image/png" });
    expect(res.status).toBe(401);
  });

  it("accepts an authenticated valid image and stores the validated content type", async () => {
    setSession(COMPANY_A);
    const res = await upload({ name: "a.png", type: "image/png" });
    expect(res.status).toBe(200);
    const body = await res.json();
    // The bytes go to the media store and the caller gets a URL back, never
    // the file itself inlined into a column.
    expect(body.url).toMatch(/^\/api\/media\/[0-9a-f]{64}$/);
    expect(db.mediaAsset.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ mimeType: "image/png" }) }),
    );
  });

  it("stores the server-side type, not the client's, for a mislabelled-but-valid pair", async () => {
    setSession(FREELANCER_A);
    // MIME with a parameter the client appended; the stored type is canonical.
    const res = await upload({ name: "a.pdf", type: "application/pdf; charset=binary" });
    expect(res.status).toBe(200);
    const body = await res.json();
    // The canonical allowlist type is stored, not the parameterised string
    // the client sent — the guarantee the data: URL form used to carry.
    expect(body.url).toMatch(/^\/api\/media\/[0-9a-f]{64}$/);
    expect(db.mediaAsset.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ mimeType: "application/pdf" }) }),
    );
  });

  it("rejects an SVG upload", async () => {
    setSession(COMPANY_A);
    const res = await upload({ name: "icon.svg", type: "image/svg+xml" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/SVG uploads are not supported/);
  });

  it("rejects a MIME/extension mismatch", async () => {
    setSession(COMPANY_A);
    const res = await upload({ name: "payload.png", type: "text/html" });
    expect(res.status).toBe(400);
  });

  it("rejects an oversized file on the received bytes", async () => {
    setSession(COMPANY_A);
    const res = await upload({
      name: "big.png",
      type: "image/png",
      bytes: Buffer.alloc(MAX_SIZES.image + 1, 1),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/exceeds the limit/);
  });

  it("rejects a request with no file", async () => {
    setSession(COMPANY_A);
    const form = new FormData();
    const res = await POST(
      new Request("http://localhost/api/upload", { method: "POST", body: form }) as never
    );
    expect(res.status).toBe(400);
  });
});
