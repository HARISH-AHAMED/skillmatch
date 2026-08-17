import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createDbMock,
  sessionState,
  setSession,
  signedOut,
  COMPANY_A,
  FREELANCER_A,
} from "./helpers/mocks";

const db = createDbMock();
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/auth", () => ({
  auth: async () => (sessionState.user ? { user: sessionState.user } : null),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { updateTaskStatus, updateTaskDetails, deleteTask, deleteFile, deleteMessage } =
  await import("@/actions/collaborationActions");

const PROJECT_A = "project-a";

/** The caller legitimately belongs to project A. */
function grantAccessToProjectA() {
  db.project.findUnique.mockResolvedValue({
    id: PROJECT_A,
    title: "A's project",
    company: { userId: COMPANY_A!.id },
    applications: [],
  });
}

beforeEach(() => {
  signedOut();
  Object.values(db).forEach((m) => {
    if (m && typeof m === "object") Object.values(m).forEach((fn: any) => fn?.mockReset?.());
  });
  setSession(COMPANY_A);
  grantAccessToProjectA();
});

/**
 * KANBAN-001 / WS-001 — Class B.
 *
 * These mutations ran a correct project-access check and then acted on a record
 * id that was never confirmed to live in that project. The caller below always
 * has genuine access to project A; the record belongs to project B.
 *
 * Audit "Validate": as a member of project A, call deleteTask(projectA.id,
 * <task id from project B>); expect failure and no deletion.
 *
 * The scoped* helpers query with `{ id, projectId }`, so a foreign record
 * simply does not match — modelled here by findFirst resolving null.
 */
describe("Class B: record ids are scoped to the project", () => {
  describe("KANBAN-001: task mutations", () => {
    it("refuses to change the status of a task from another project", async () => {
      db.task.findFirst.mockResolvedValue(null); // foreign task: no match when scoped
      const res = await updateTaskStatus(PROJECT_A, "task-from-project-b", "DONE");
      expect(res.error).toBeTruthy();
      expect(db.task.update).not.toHaveBeenCalled();
    });

    it("refuses to edit the details of a task from another project", async () => {
      db.task.findFirst.mockResolvedValue(null);
      const res = await updateTaskDetails(PROJECT_A, "task-from-project-b", { title: "hijacked" });
      expect(res.error).toBeTruthy();
      expect(db.task.update).not.toHaveBeenCalled();
    });

    it("refuses to delete a task from another project", async () => {
      db.task.findFirst.mockResolvedValue(null);
      const res = await deleteTask(PROJECT_A, "task-from-project-b");
      expect(res.error).toBeTruthy();
      expect(db.task.delete).not.toHaveBeenCalled();
    });

    it("still allows the same operations on a task that does belong to the project", async () => {
      db.task.findFirst.mockResolvedValue({ id: "task-a", projectId: PROJECT_A });
      db.task.update.mockResolvedValue({ id: "task-a", status: "DONE" });
      const res = await updateTaskStatus(PROJECT_A, "task-a", "DONE");
      expect(res.success).toBe(true);
      expect(db.task.update).toHaveBeenCalled();
    });
  });

  describe("WS-001: file deletion", () => {
    it("refuses to delete a file from another project, and unlinks nothing", async () => {
      db.sharedFile.findFirst.mockResolvedValue(null);
      const res = await deleteFile(PROJECT_A, "file-from-project-b");
      expect(res.error).toBeTruthy();
      expect(db.sharedFile.delete).not.toHaveBeenCalled();
    });

    it("allows the owning company to delete a file in its own project", async () => {
      db.sharedFile.findFirst.mockResolvedValue({
        id: "file-a",
        projectId: PROJECT_A,
        uploadedById: "someone-else",
        fileUrl: "data:text/plain;base64,aGk=",
      });
      const res = await deleteFile(PROJECT_A, "file-a");
      expect(res.success).toBe(true);
      expect(db.sharedFile.delete).toHaveBeenCalled();
    });

    it("still stops a freelancer deleting someone else's file in their own project", async () => {
      setSession(FREELANCER_A);
      db.project.findUnique.mockResolvedValue({
        id: PROJECT_A,
        title: "A's project",
        company: { userId: COMPANY_A!.id },
        applications: [{ id: "app-fa", freelancer: { userId: FREELANCER_A!.id } }],
      });
      db.sharedFile.findFirst.mockResolvedValue({
        id: "file-a",
        projectId: PROJECT_A,
        uploadedById: "another-user",
        fileUrl: "/uploads/x.png",
      });
      const res = await deleteFile(PROJECT_A, "file-a");
      expect(res.error).toMatch(/only delete their own/i);
      expect(db.sharedFile.delete).not.toHaveBeenCalled();
    });
  });

  describe("deleteMessage (same shape, confirmed by the sweep)", () => {
    it("refuses a message from another project", async () => {
      db.message.findFirst.mockResolvedValue(null);
      const res = await deleteMessage(PROJECT_A, "message-from-project-b");
      expect(res.error).toBeTruthy();
      expect(db.message.delete).not.toHaveBeenCalled();
    });

    it("still refuses deleting another user's message in the same project", async () => {
      db.message.findFirst.mockResolvedValue({
        id: "msg-1",
        projectId: PROJECT_A,
        senderId: "not-the-caller",
      });
      const res = await deleteMessage(PROJECT_A, "msg-1");
      expect(res.error).toMatch(/your own messages/i);
      expect(db.message.delete).not.toHaveBeenCalled();
    });
  });
});
