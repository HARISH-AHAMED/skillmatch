"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/actions/authActions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Plus, UserPlus } from "lucide-react";
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
        password,
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

      <Modal
        open={isOpen}
        onClose={() => !loading && setIsOpen(false)}
        size="lg"
        title={
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF1FE]">
              <UserPlus className="h-5 w-5 text-[#2159C9]" aria-hidden="true" />
            </span>
            Add New User
          </span>
        }
        description="Create a new platform workspace account"
      >
        <div>
            {/* Error / Success Feedback */}
            {error && (
              <div className="p-3 bg-[#FDEAEA] border border-[#F5C2C2] rounded-lg text-xs font-semibold text-[#BC2A2A] mb-4 animate-in fade-in duration-150">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-[#E4F7EC] border border-[#BFE9D2] rounded-lg text-xs font-semibold text-[#147A44] mb-4 animate-in fade-in duration-150">
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

              <div className="flex gap-3 justify-end pt-4 border-t border-[#E3E5EA] mt-6">
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
        </div>
      </Modal>
    </>
  );
}
