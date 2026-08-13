"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { registerUser } from "@/actions/authActions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Sparkles, Users, Building } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.FREELANCER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await registerUser({
        name,
        email,
        passwordHash: password,
        role,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        // Auto sign-in
        const loginRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (loginRes?.error) {
          setError("Account created, but sign-in failed. Redirecting to login page...");
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        } else {
          router.refresh();
          router.push("/");
        }
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-white text-[#181d26]">
      <div className="w-full max-w-md space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-10 w-10 rounded-[8px] bg-[#FFC700] items-center justify-center text-[#181D26]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-normal text-[#181d26] tracking-tight">Create Talentra Account</h1>
          <p className="text-xs text-[#333840]">Join our marketplace and start collaborating today</p>
        </div>

        {/* Card containing register forms */}
        <Card className="p-8 border-[#E2E5EA] bg-white rounded-[12px] shadow-xs space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-[6px] text-xs font-medium text-rose-600">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Sarah Carter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="sarah@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            {/* Role Switcher */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#333840]">Account Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole(Role.FREELANCER)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-[6px] border transition-all cursor-pointer ${
                    role === Role.FREELANCER
                      ? "border-[#181d26] bg-[#181d26] text-white"
                      : "border-[#E2E5EA] bg-[#F7F8FA] text-[#333840] hover:bg-[#EDEFF2]"
                  }`}
                  disabled={loading}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span className="text-xs font-medium">Freelancer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole(Role.COMPANY)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-[6px] border transition-all cursor-pointer ${
                    role === Role.COMPANY
                      ? "border-[#181d26] bg-[#181d26] text-white"
                      : "border-[#E2E5EA] bg-[#F7F8FA] text-[#333840] hover:bg-[#EDEFF2]"
                  }`}
                  disabled={loading}
                >
                  <Building className="h-4.5 w-4.5" />
                  <span className="text-xs font-medium">Company</span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4 cursor-pointer"
              disabled={loading}
            >
              {loading ? "Registering..." : "Create Account"}
            </Button>
          </form>
        </Card>

        {/* Link back or login */}
        <p className="text-center text-xs text-[#333840] font-normal">
          Already have an account?{" "}
          <Link href="/login" className="text-[#1968E5] hover:underline font-medium">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}

