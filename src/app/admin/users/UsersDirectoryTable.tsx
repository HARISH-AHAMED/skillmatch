"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Trash2, ShieldAlert, Users } from "lucide-react";
import { deleteUser, updateUserRole } from "@/actions/authActions";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  createdAt: Date;
}

interface UsersDirectoryTableProps {
  initialUsers: User[];
}

export function UsersDirectoryTable({ initialUsers }: UsersDirectoryTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Role>(Role.FREELANCER);
  const [error, setError] = useState("");

  // Filter users based on role
  const freelancers = initialUsers.filter((u) => u.role === Role.FREELANCER);
  const companies = initialUsers.filter((u) => u.role === Role.COMPANY);
  const admins = initialUsers.filter((u) => u.role === Role.ADMIN);

  const activeUsers = 
    activeTab === Role.FREELANCER 
      ? freelancers 
      : activeTab === Role.COMPANY 
      ? companies 
      : admins;

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return <Badge variant="danger">Admin</Badge>;
      case Role.COMPANY:
        return <Badge variant="secondary">Company</Badge>;
      case Role.FREELANCER:
      default:
        return <Badge variant="primary">Freelancer</Badge>;
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    setError("");
    startTransition(async () => {
      const res = await deleteUser(userId);
      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleRoleChange = async (userId: string, nextRole: Role) => {
    setError("");
    startTransition(async () => {
      const res = await updateUserRole(userId, nextRole);
      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-[#FDEAEA] border border-[#F5C2C2] rounded-lg text-xs font-semibold text-[#BC2A2A] animate-in fade-in duration-150">
          {error}
        </div>
      )}

      {/* Tabs Switcher */}
      <Tabs
        label="User directory"
        value={activeTab}
        onChange={(id) => setActiveTab(id as Role)}
        items={[
          { id: Role.FREELANCER, label: "Freelancers", count: freelancers.length },
          { id: Role.COMPANY, label: "Companies", count: companies.length },
          { id: Role.ADMIN, label: "Admins", count: admins.length },
        ]}
      />

      <Card className="p-0 overflow-hidden bg-white border border-[#E3E5EA] rounded-b-xl rounded-t-none">
        <div className="overflow-x-auto">
          {activeUsers.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <Users className="h-8 w-8 text-[#2159C9] mb-3" />
              <p className="text-[#5B6272] font-medium text-xs">
                No users found under this tab.
              </p>
            </div>
          ) : (
            <Table wrapperClassName="border-0 rounded-none">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Name</TH>
                  <TH>Email</TH>
                  <TH>Registered</TH>
                  <TH>Current Role</TH>
                  <TH align="right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {activeUsers.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-semibold">
                      {u.name || "Anonymous User"}
                    </TD>
                    <TD className="font-mono text-[#5B6272]">{u.email || "N/A"}</TD>
                    <TD className="text-[#5B6272]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TD>
                    <TD>{getRoleBadge(u.role)}</TD>
                    <TD align="right">
                      <div className="flex gap-2.5 justify-end items-center">
                        {/* Update Role Selector */}
                        <div className="flex gap-1.5 items-center">
                          <select
                            value={u.role}
                            disabled={isPending}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value as Role)
                            }
                            className="px-2 py-1 bg-white border border-[#C7CBD6] rounded-md text-[11px] focus:outline-none focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] text-[#1A1D29] cursor-pointer disabled:opacity-50"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="COMPANY">Company</option>
                            <option value="FREELANCER">Freelancer</option>
                          </select>
                        </div>

                        {/* Delete Button */}
                        <Button
                          onClick={() => handleDelete(u.id)}
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          className="text-[#BC2A2A] hover:text-[#BC2A2A] hover:bg-[#FDEAEA] cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
