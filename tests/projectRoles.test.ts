import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDbMock, sessionState, setSession, COMPANY_A } from "./helpers/mocks";

/**
 * The edit screen gives a freshly added role a local key so React can track it
 * in the list. That key was sent to saveProjectRoles as if it were a row id,
 * where the ROLE-001 ownership check reads it as an id from another project and
 * refuses the whole save. The caller ignored the returned error, so the roles
 * were dropped behind a "Project updated" toast.
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
vi.mock("@/data/server/cache", () => ({
  CACHE_TAGS: { projects: "projects" },
  invalidatePublic: vi.fn(),
}));

const { saveProjectRoles } = await import("@/actions/roleActions");

const PROJECT = {
  id: "project-1",
  company: { userId: COMPANY_A!.id },
  roles: [
    { id: "role-existing", name: "Designer", slots: 2, applications: [] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  setSession(COMPANY_A);
  db.project.findUnique.mockResolvedValue(PROJECT);
  db.projectRole.findMany.mockResolvedValue([
    { id: "role-existing", name: "Designer", description: null, slots: 2, allowApprentice: false },
    { id: "role-created", name: "Engineer", description: null, slots: 3, allowApprentice: false },
  ]);
});

describe("saveProjectRoles", () => {
  it("creates a role that arrives with no id", async () => {
    const result = await saveProjectRoles("project-1", [
      { id: "role-existing", name: "Designer", slots: 2, allowApprentice: false },
      { name: "Engineer", slots: 3, allowApprentice: false },
    ]);

    expect(result.success).toBe(true);
    expect(db.projectRole.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: "project-1", name: "Engineer", slots: 3 }),
      }),
    );
    // The existing role is updated in place, not deleted and re-made.
    expect(db.projectRole.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "role-existing" } }),
    );
    expect(db.projectRole.deleteMany).not.toHaveBeenCalled();
  });

  it("returns the saved rows so the editor can pick up the new ids", async () => {
    const result = await saveProjectRoles("project-1", [
      { id: "role-existing", name: "Designer", slots: 2, allowApprentice: false },
      { name: "Engineer", slots: 3, allowApprentice: false },
    ]);

    expect(result.roles?.map((r) => r.id)).toEqual(["role-existing", "role-created"]);
  });

  it("still refuses an id belonging to another project", async () => {
    const result = await saveProjectRoles("project-1", [
      { id: "role-from-elsewhere", name: "Engineer", slots: 3, allowApprentice: false },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/do not belong to this project/);
    expect(db.projectRole.create).not.toHaveBeenCalled();
    expect(db.projectRole.update).not.toHaveBeenCalled();
  });
});
