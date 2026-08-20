"use client";

import Link from "next/link";
import { MoreVertical, Search, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { Field, Input, Select } from "@/components/ui/Field";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { deleteUser, updateUserRole } from "@/actions/authActions";
import type { AdminUser } from "@/data/server/admin";
import type { Role } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const ROLE_TONE = {
  ADMIN: "brand",
  COMPANY: "info",
  FREELANCER: "neutral",
} as const;

export function UsersClient({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<Role>("FREELANCER");

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
                const target = roleTarget;
                setRoleTarget(null);
                if (!target) return;
                startTransition(async () => {
                  const result = await updateUserRole(target.id, newRole as never);
                  if ("error" in result && result.error) {
                    toast.toast({ title: result.error, tone: "error" });
                    return;
                  }
                  router.refresh();
                  toast.success("Role updated", `${target.name} is now ${newRole.toLowerCase()}.`);
                });
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
        onConfirm={() => {
          const target = deleteTarget;
          if (!target) return;
          startTransition(async () => {
            const result = await deleteUser(target.id);
            if ("error" in result && result.error) {
              toast.toast({ title: result.error, tone: "error" });
              return;
            }
            router.refresh();
            toast.toast({
              title: "User deleted",
              description:
                "Their profile, applications, notifications, messages and files were removed by cascade.",
              tone: "info",
            });
          });
        }}
        title={`Delete ${deleteTarget?.name}?`}
        message="This cascades to their profile, applications, notifications, messages, files and sessions. Projects and ledger entries they touched are retained."
        confirmLabel="Delete user"
        destructive
      />
    </div>
  );
}
