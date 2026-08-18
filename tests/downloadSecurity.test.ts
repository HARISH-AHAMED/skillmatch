import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDbMock, sessionState, setSession, signedOut, COMPANY_A } from "./helpers/mocks";

const db = createDbMock();
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/auth", () => ({
  auth: async () => (sessionState.user ? { user: sessionState.user } : null),
}));

const partyResult = { ok: true as boolean, error: undefined as string | undefined };
vi.mock("@/lib/authz", () => ({
  requireProjectParty: async () => partyResult,
}));

const { GET } = await import("@/app/workspace/downloads/[fileName]/route");

const call = (fileName: string) =>
  GET(new Request("http://localhost/x") as never, { params: Promise.resolve({ fileName }) });

const PNG_DATA_URL = "data:image/png;base64," + Buffer.from("png-bytes").toString("base64");

beforeEach(() => {
  signedOut();
  db.sharedFile.findFirst.mockReset();
  partyResult.ok = true;
});

describe("SEC-015 / SEC-008: workspace download route", () => {
  it("serves an existing data: URL to an authorised party", async () => {
    setSession(COMPANY_A);
    db.sharedFile.findFirst.mockResolvedValue({
      id: "f1", projectId: "p1", fileName: "logo.png", fileUrl: PNG_DATA_URL,
    });
    const res = await call("logo.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe("png-bytes");
  });

  it("downgrades a legacy data: URL that recorded an active content type", async () => {
    setSession(COMPANY_A);
    db.sharedFile.findFirst.mockResolvedValue({
      id: "f2", projectId: "p1", fileName: "old.png",
      fileUrl: "data:text/html;base64," + Buffer.from("<script>alert(1)</script>").toString("base64"),
    });
    const res = await call("old.png");
    expect(res.status).toBe(200);
    // Still downloadable — but never served as a renderable active type.
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("rejects a caller who is not a party to the owning project", async () => {
    setSession(COMPANY_A);
    db.sharedFile.findFirst.mockResolvedValue({
      id: "f3", projectId: "p1", fileName: "logo.png", fileUrl: PNG_DATA_URL,
    });
    partyResult.ok = false;
    const res = await call("logo.png");
    expect(res.status).toBe(404);
  });

  it("does not regress path traversal: the input is only ever a lookup key", async () => {
    setSession(COMPANY_A);
    db.sharedFile.findFirst.mockResolvedValue(null);
    const res = await call("..%2f..%2f.env");
    expect(res.status).toBe(404);
    // The traversal string was used to query, never to build a path.
    const where = db.sharedFile.findFirst.mock.calls[0][0].where;
    expect(where.fileUrl.endsWith).toBe("/../../.env");
  });

  it("returns 404 for an unknown file", async () => {
    setSession(COMPANY_A);
    db.sharedFile.findFirst.mockResolvedValue(null);
    expect((await call("nope.png")).status).toBe(404);
  });
});
