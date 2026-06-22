"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/actions/authActions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Plus, X, UserPlus } from "lucide-react";
import { Role } from "@prisma/client";

export function AddUserModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.FREELANCER);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await registerUser({
        name,
        email,
        passwordHash: password,
        role,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess("User created successfully!");
        // Reset form
        setName("");
        setEmail("");
        setPassword("");
        setRole(Role.FREELANCER);
        
        // Refresh page to show new user in directory
        setTimeout(() => {
          setIsOpen(false);
          setSuccess("");
          router.refresh();
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="cursor-pointer gap-1.5 flex items-center"
      >
        <Plus className="h-4 w-4" /> Add New User
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => !loading && setIsOpen(false)}
          />

          {/* Modal Container */}
          <Card className="relative w-full max-w-md p-8 z-10 border-slate-100 bg-white shadow-2xl rounded-3xl animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="absolute top-5 right-5 p-1 text-slate-450 hover:text-slate-700 rounded-full hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
              <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100">
                <UserPlus className="h-5 w-5 text-[#002d59]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#002d59]">Add New User</h3>
                <p className="text-[10px] text-slate-500 font-medium">Create a new platform workspace account</p>
              </div>
            </div>

            {/* Error / Success Feedback */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 mb-4 animate-in fade-in duration-150">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 mb-4 animate-in fade-in duration-150">
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Sarah Dev"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="sarah@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />

              <Input
                label="Password"
                type="text"
                placeholder="Securepassword123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />

              <Select
                label="Account Role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                disabled={loading}
                options={[
                  { value: Role.FREELANCER, label: "Freelancer Profile" },
                  { value: Role.COMPANY, label: "Company Profile" },
                  { value: Role.ADMIN, label: "Admin Profile" },
                ]}
              />

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="cursor-pointer">
                  {loading ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
