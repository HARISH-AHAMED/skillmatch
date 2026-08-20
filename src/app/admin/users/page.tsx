"use client";

import Link from "next/link";
import { MoreVertical, Plus, Search, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { Field, Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { COMPANIES, FREELANCERS } from "@/data/queries";
import type { Role } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string;
  profileHref: string;
  verified: boolean;
  joined: string;
}

const ROLE_TONE = {
  ADMIN: "brand",
  COMPANY: "info",
  FREELANCER: "neutral",
} as const;

export default function AdminUsersPage() {
  const toast = useToast();
  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<Role>("FREELANCER");
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "FREELANCER" as Role });

  const users = useMemo<AdminUser[]>(
    () => [
      {
        id: "u-admin",
        name: "Platform Admin",
        email: "admin@frivvo.com",
        role: "ADMIN",
        avatarUrl: "",
        profileHref: "/admin/dashboard",
        verified: true,
        joined: "2024-01-04",
      },
      ...COMPANIES.map((c) => ({
        id: c.userId,
        name: c.companyName,
        email: c.email,
        role: "COMPANY" as Role,
        avatarUrl: c.logoUrl,
        profileHref: `/companies/${c.id}`,
        verified: c.verificationBadges.includes("Identity Verified"),
        joined: `${c.foundedYear + 3}-03-12`,
      })),
      ...FREELANCERS.map((f) => ({
        id: f.userId,
        name: f.name,
        email: f.email,
        role: "FREELANCER" as Role,
        avatarUrl: f.avatarUrl,
        profileHref: `/freelancers/${f.id}`,
        verified: f.verificationBadges.includes("Identity Verified"),
        joined: `${2026 - Math.min(f.experienceYears, 5)}-06-18`,
      })),
    ],
    [],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: users.length };
    for (const r of ["ADMIN", "COMPANY", "FREELANCER"]) {
      map[r] = users.filter((u) => u.role === r).length;
    }
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    let list = tab === "ALL" ? users : users.filter((u) => u.role === tab);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, tab, query]);

  const columns: Column<AdminUser>[] = [
    {
      key: "user",
      header: "User",
      essential: true,
      render: (u) => (
        <Link href={u.profileHref} className="flex items-center gap-3">
          <Avatar src={u.avatarUrl} name={u.name} size="sm" rounded={u.role === "COMPANY" ? "md" : "full"} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium text-[var(--color-text-primary)]">
                {u.name}
              </span>
              {u.verified && (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" />
              )}
            </span>
            <span className="block truncate text-[11.5px] text-[var(--color-text-muted)]">
              {u.email}
            </span>
          </span>
        </Link>
      ),
    },
    {
      key: "role",
      header: "Role",
      essential: true,
      render: (u) => (
        <Badge tone={ROLE_TONE[u.role]} size="sm">
          {u.role.toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "verified",
      header: "Verification",
      render: (u) =>
        u.verified ? (
          <span className="text-[var(--color-success-fg)]">Verified</span>
        ) : (
          <span className="text-[var(--color-text-muted)]">Unverified</span>
        ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (u) => formatDate(u.joined),
    },
    {
      key: "actions",
      header: "",
      essential: true,
      width: "56px",
      render: (u) => (
        <Dropdown
          align="end"
          trigger={
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]">
              <MoreVertical className="h-4 w-4" />
            </span>
          }
          items={[
            { label: "View profile", href: u.profileHref },
            {
              label: "Change role",
              icon: <UserCog />,
              onClick: () => {
                setRoleTarget(u);
                setNewRole(u.role);
              },
            },
            {
              label: "Delete user",
              icon: <Trash2 />,
              destructive: true,
              separatorBefore: true,
              disabled: u.role === "ADMIN",
              onClick: () => setDeleteTarget(u),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users management"
        description={`${users.length} accounts. Admin cannot be self-assigned through registration — it is granted here or by seed.`}
        action={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
            Add user
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <Tabs
          variant="pill"
          value={tab}
          onChange={setTab}
          items={[
            { id: "ALL", label: "All", count: counts.ALL },
            { id: "FREELANCER", label: "Freelancers", count: counts.FREELANCER },
            { id: "COMPANY", label: "Companies", count: counts.COMPANY },
            { id: "ADMIN", label: "Admins", count: counts.ADMIN },
          ]}
        />
        <Input
          placeholder="Search by name or email"
          leftIcon={<Search />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
          className="max-w-md"
        />
      </div>

      <div className="mt-5">
        <DataTable columns={columns} rows={filtered} />
      </div>

      {/* ---- Add user ---- */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a user"
        description="Creating a user here bypasses public registration, so admin can be granted directly."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newUser.name.trim() || !newUser.email.trim()}
              onClick={() => {
                setAdding(false);
                toast.success("User created", `${newUser.name} can now sign in.`);
                setNewUser({ name: "", email: "", role: "FREELANCER" });
              }}
            >
              Create user
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            <Input
              value={newUser.name}
              onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
            />
          </Field>
          <Field label="Email" required help="Stored and compared lowercased, and must be unique.">
            <Input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
            />
          </Field>
          <Field label="Role" required>
            <Select
              value={newUser.role}
              onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value as Role }))}
            >
              <option value="FREELANCER">Freelancer</option>
              <option value="COMPANY">Company</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </Field>
          {newUser.role === "ADMIN" && (
            <Alert tone="warning" title="Granting admin access">
              Admins can view and modify every user, company, project and review on the platform.
              Every action they take is recorded in the admin log.
            </Alert>
          )}
        </div>
      </Modal>

      {/* ---- Change role ---- */}
      <Modal
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        title={`Change role for ${roleTarget?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRoleTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setRoleTarget(null);
                toast.success("Role updated", `${roleTarget?.name} is now ${newRole.toLowerCase()}.`);
              }}
            >
              Update role
            </Button>
          </>
        }
      >
        <Field label="New role" help="Changing a role does not migrate existing profile data.">
          <Select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
            <option value="FREELANCER">Freelancer</option>
            <option value="COMPANY">Company</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>
      </Modal>

      {/* ---- Delete ---- */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          toast.toast({
            title: "User deleted",
            description:
              "Their profile, applications, notifications, messages and files were removed by cascade.",
            tone: "info",
          })
        }
        title={`Delete ${deleteTarget?.name}?`}
        message="This cascades to their profile, applications, notifications, messages, files and sessions. Projects and ledger entries they touched are retained."
        confirmLabel="Delete user"
        destructive
      />
    </div>
  );
}
