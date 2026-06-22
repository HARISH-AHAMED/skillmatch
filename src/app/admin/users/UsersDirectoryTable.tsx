"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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

  const tabClass = (tabRole: Role) => {
    const isActive = activeTab === tabRole;
    return `flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-xs transition-all duration-200 cursor-pointer ${
      isActive
        ? "border-[#002d59] text-[#002d59] bg-[#002d59]/5 font-bold"
        : "border-transparent text-slate-500 hover:text-[#002d59] hover:bg-slate-50"
    }`;
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 animate-in fade-in duration-150">
          {error}
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-hidden shadow-sm">
        <button
          onClick={() => setActiveTab(Role.FREELANCER)}
          className={tabClass(Role.FREELANCER)}
        >
          Freelancers
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === Role.FREELANCER 
              ? "bg-[#002d59] text-white" 
              : "bg-slate-100 text-slate-600"
          }`}>
            {freelancers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab(Role.COMPANY)}
          className={tabClass(Role.COMPANY)}
        >
          Companies
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === Role.COMPANY 
              ? "bg-[#002d59] text-white" 
              : "bg-slate-100 text-slate-600"
          }`}>
            {companies.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab(Role.ADMIN)}
          className={tabClass(Role.ADMIN)}
        >
          Admins
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === Role.ADMIN 
              ? "bg-[#002d59] text-white" 
              : "bg-slate-100 text-slate-600"
          }`}>
            {admins.length}
          </span>
        </button>
      </div>

      <Card className="p-0 overflow-hidden bg-white border border-slate-100 shadow-sm rounded-b-xl rounded-t-none">
        <div className="overflow-x-auto">
          {activeUsers.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <Users className="h-8 w-8 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium text-xs">
                No users found under this tab.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Registered</th>
                  <th className="p-4">Current Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 text-slate-600">
                    <td className="p-4 font-bold text-[#002d59]">
                      {u.name || "Anonymous User"}
                    </td>
                    <td className="p-4 font-mono">{u.email || "N/A"}</td>
                    <td className="p-4">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">{getRoleBadge(u.role)}</td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2.5 justify-end items-center">
                        {/* Update Role Selector */}
                        <div className="flex gap-1.5 items-center">
                          <select
                            value={u.role}
                            disabled={isPending}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value as Role)
                            }
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:border-[#002d59] text-slate-800 cursor-pointer disabled:opacity-50"
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
                          className="text-rose-600 hover:text-rose-500 hover:bg-rose-50 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
