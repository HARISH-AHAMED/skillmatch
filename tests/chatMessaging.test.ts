import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDbMock, sessionState, setSession, signedOut, COMPANY_A, FREELANCER_A, FREELANCER_B } from "./helpers/mocks";
import { MESSAGE_EDIT_WINDOW_MINUTES } from "@/lib/constants";
import { dmChannel } from "@/lib/domain";

/**
 * Chat: direct messages, editing within a window, and soft deletion.
 *
 * The DM channel is keyed on *user* ids. The freelancer side used to address
 * the company by `u-${project.companyId}` — a Company row id behind a made-up
 * prefix — so the two sides computed different channel strings and neither
 * ever saw the other.
 */

const db = createDbMock();
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/auth", () => ({
  auth: async () => (sessionState.user ? { user: sessionState.user } : null),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

const { sendMessage, editMessage, deleteMessage } = await import(
  "@/actions/collaborationActions"
);

const COMPANY_USER = COMPANY_A!.id;
const FREELANCER_USER = FREELANCER_A!.id;

/** A project with the company and one hired freelancer. */
function arrangeProject() {
  db.project.findUnique.mockResolvedValue({
    id: "p1",
    title: "Redesign",
    company: { userId: COMPANY_USER },
    applications: [{ freelancer: { userId: FREELANCER_USER } }],
  });
  db.message.create.mockResolvedValue({ id: "m-new" });
  db.notification.create.mockResolvedValue({});
}

function arrangeMessage(over: Record<string, unknown> = {}) {
  db.message.findFirst.mockResolvedValue({
    id: "m1",
    projectId: "p1",
    senderId: FREELANCER_USER,
    content: "original text",
    channel: "group",
    createdAt: new Date(),
    deletedAt: null,
    editedAt: null,
    ...over,
  });
  db.message.update.mockResolvedValue({ id: "m1" });
}

beforeEach(() => {
  Object.values(db).forEach((m: any) => {
    if (typeof m === "function") m.mockReset?.();
    else Object.values(m).forEach((f: any) => f.mockReset?.());
  });
  signedOut();
});

describe("direct messages are addressed by user id", () => {
  it("accepts a DM between the freelancer and the company", async () => {
    setSession(FREELANCER_A);
    arrangeProject();

    // The channel both sides now compute, from user ids.
    const channel = dmChannel(FREELANCER_USER, COMPANY_USER);
    const res = await sendMessage("p1", "hello", channel);

    expect(res.success).toBe(true);
    expect(db.message.create.mock.calls[0][0].data.channel).toBe(channel);
    // The counterpart is notified, which is the other half of a working DM.
    expect(db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: COMPANY_USER }) })
    );
  });

  it("both sides compute the same channel string", () => {
    expect(dmChannel(FREELANCER_USER, COMPANY_USER)).toBe(
      dmChannel(COMPANY_USER, FREELANCER_USER)
    );
  });

  it("rejects the old company-row-id channel that never reached anyone", async () => {
    setSession(FREELANCER_A);
    arrangeProject();

    // What the freelancer client used to build: a Company row id, prefixed.
    const broken = dmChannel(FREELANCER_USER, "u-company-a");
    const res = await sendMessage("p1", "hello", broken);

    expect(res.error).toMatch(/direct message channel/i);
    expect(db.message.create).not.toHaveBeenCalled();
  });

  it("rejects a DM to someone who is not on the project", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    const res = await sendMessage("p1", "hi", dmChannel(FREELANCER_USER, FREELANCER_B!.id));
    expect(res.error).toMatch(/direct message channel/i);
    expect(db.message.create).not.toHaveBeenCalled();
  });

  it("rejects a channel the sender is not part of", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    const res = await sendMessage("p1", "hi", dmChannel(COMPANY_USER, FREELANCER_B!.id));
    expect(res.error).toMatch(/direct message channel/i);
  });
});

describe("editing is bounded by the window and by ownership", () => {
  it("saves an edit inside the window and stamps editedAt", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    arrangeMessage({ createdAt: new Date(Date.now() - 60_000) }); // a minute old

    const res = await editMessage("p1", "m1", "corrected text");
    expect(res.success).toBe(true);

    const data = db.message.update.mock.calls[0][0].data;
    expect(data.content).toBe("corrected text");
    expect(data.editedAt).toBeInstanceOf(Date);
  });

  it("refuses once the window has lapsed", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    arrangeMessage({
      createdAt: new Date(Date.now() - (MESSAGE_EDIT_WINDOW_MINUTES + 1) * 60_000),
    });

    const res = await editMessage("p1", "m1", "too late");
    expect(res.error).toMatch(new RegExp(`${MESSAGE_EDIT_WINDOW_MINUTES} minutes`));
    expect(db.message.update).not.toHaveBeenCalled();
  });

  it("measures the window from the send, so repeated edits cannot walk it forward", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    // Sent long ago but edited a moment ago: still refused.
    arrangeMessage({
      createdAt: new Date(Date.now() - 60 * 60_000),
      editedAt: new Date(Date.now() - 1_000),
    });

    const res = await editMessage("p1", "m1", "sneaky");
    expect(res.error).toMatch(/minutes after sending/i);
    expect(db.message.update).not.toHaveBeenCalled();
  });

  it("refuses to edit someone else's message", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    arrangeMessage({ senderId: COMPANY_USER });

    const res = await editMessage("p1", "m1", "not mine");
    expect(res.error).toMatch(/only edit your own/i);
    expect(db.message.update).not.toHaveBeenCalled();
  });

  it("refuses to edit a deleted message", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    arrangeMessage({ deletedAt: new Date(), content: "" });

    const res = await editMessage("p1", "m1", "resurrect");
    expect(res.error).toMatch(/was deleted/i);
    expect(db.message.update).not.toHaveBeenCalled();
  });

  it("refuses an empty edit rather than blanking the message", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    arrangeMessage();

    const res = await editMessage("p1", "m1", "   ");
    expect(res.error).toMatch(/cannot be empty/i);
    expect(db.message.update).not.toHaveBeenCalled();
  });

  it("refuses an edit from outside the project", async () => {
    setSession(FREELANCER_B);
    db.project.findUnique.mockResolvedValue({
      id: "p1",
      title: "Redesign",
      company: { userId: COMPANY_USER },
      applications: [{ freelancer: { userId: FREELANCER_USER } }],
    });

    const res = await editMessage("p1", "m1", "outsider");
    expect(res.error).toMatch(/access denied/i);
    expect(db.message.update).not.toHaveBeenCalled();
  });
});

describe("deleting leaves a tombstone rather than removing the row", () => {
  it("soft deletes and clears the text", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    arrangeMessage();

    const res = await deleteMessage("p1", "m1");
    expect(res.success).toBe(true);

    // The row survives, so the conversation keeps its shape …
    expect(db.message.delete).not.toHaveBeenCalled();
    const data = db.message.update.mock.calls[0][0].data;
    expect(data.deletedAt).toBeInstanceOf(Date);
    // … and the text is genuinely gone, not merely hidden by the client.
    expect(data.content).toBe("");
  });

  it("is idempotent on an already-deleted message", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    arrangeMessage({ deletedAt: new Date(), content: "" });

    const res = await deleteMessage("p1", "m1");
    expect(res.success).toBe(true);
    expect(db.message.update).not.toHaveBeenCalled();
  });

  it("refuses to delete someone else's message", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    arrangeMessage({ senderId: COMPANY_USER });

    const res = await deleteMessage("p1", "m1");
    expect(res.error).toMatch(/only delete your own/i);
    expect(db.message.update).not.toHaveBeenCalled();
  });

  it("refuses a message that is not in this project", async () => {
    setSession(FREELANCER_A);
    arrangeProject();
    db.message.findFirst.mockResolvedValue(null); // scoped lookup finds nothing

    const res = await deleteMessage("p1", "other-project-message");
    expect(res.error).toMatch(/not found/i);
    expect(db.message.update).not.toHaveBeenCalled();
  });
});
