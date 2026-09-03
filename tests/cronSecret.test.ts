import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createDbMock } from "./helpers/mocks";

/**
 * A-02 — the message-retention job permanently deletes every message older than
 * the TTL, across every project on the platform. It ran on an unauthenticated
 * GET as well as an unauthenticated DELETE, and the proxy could not help
 * because its matcher excludes /api: one anonymous request wiped the platform's
 * message history.
 */

const db = createDbMock();
vi.mock("@/lib/db", () => ({ db }));

const { GET, DELETE } = await import("@/app/api/cron/cleanup-messages/route");

const SECRET = "test-only-cron-secret";
const original = process.env.CRON_SECRET;

function request(authorization?: string) {
  return new NextRequest("http://localhost/api/cron/cleanup-messages", {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  db.message.deleteMany.mockReset();
  db.message.deleteMany.mockResolvedValue({ count: 7 });
  process.env.CRON_SECRET = SECRET;
});

afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

describe("A-02: the cleanup job fails closed", () => {
  it("rejects an unauthenticated DELETE and deletes nothing", async () => {
    const res = await DELETE(request());
    expect(res.status).toBe(401);
    expect(db.message.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated GET, which was the unprotected alias", async () => {
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(db.message.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects a wrong secret", async () => {
    const res = await DELETE(request("Bearer not-the-secret"));
    expect(res.status).toBe(401);
    expect(db.message.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects a secret with the right prefix but wrong length", async () => {
    const res = await DELETE(request(`Bearer ${SECRET}extra`));
    expect(res.status).toBe(401);
    expect(db.message.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects a malformed authorization header", async () => {
    for (const header of [SECRET, `Basic ${SECRET}`, "Bearer", "Bearer "]) {
      db.message.deleteMany.mockClear();
      const res = await DELETE(request(header));
      expect(res.status).toBe(401);
      expect(db.message.deleteMany).not.toHaveBeenCalled();
    }
  });

  it("fails closed when CRON_SECRET is not configured at all", async () => {
    delete process.env.CRON_SECRET;
    // Not even a well-formed bearer token may run the job without a configured
    // secret — an absent secret must not read as "no check required".
    expect((await DELETE(request("Bearer anything"))).status).toBe(401);
    expect((await GET(request("Bearer anything"))).status).toBe(401);
    expect((await DELETE(request())).status).toBe(401);
    expect(db.message.deleteMany).not.toHaveBeenCalled();
  });

  it("fails closed when CRON_SECRET is an empty string", async () => {
    process.env.CRON_SECRET = "";
    expect((await DELETE(request("Bearer "))).status).toBe(401);
    expect(db.message.deleteMany).not.toHaveBeenCalled();
  });

  it("never echoes the secret in a rejection body", async () => {
    const res = await DELETE(request("Bearer wrong"));
    const body = await res.text();
    expect(body).not.toContain(SECRET);
  });
});

describe("A-02: the cleanup job runs when correctly authenticated", () => {
  it("authorises a matching bearer token and deletes past the cutoff", async () => {
    const res = await DELETE(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.deletedCount).toBe(7);

    // Scoped by age — never an unconditional deleteMany.
    const where = db.message.deleteMany.mock.calls[0][0].where;
    expect(where.createdAt.lt).toBeInstanceOf(Date);
    const days = (Date.now() - where.createdAt.lt.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it("authorises the GET form the scheduler uses", async () => {
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(db.message.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("reports a failure without leaking the secret", async () => {
    db.message.deleteMany.mockRejectedValue(new Error("connection lost"));
    const res = await DELETE(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain(SECRET);
  });
});
