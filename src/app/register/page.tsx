"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { registerUser } from "@/actions/authActions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
    <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden bg-gradient-to-b from-[#f4f8ff] to-[#ffffff]">
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-[#3ac0ff]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#002d59]/4 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#002d59] to-[#3ac0ff] items-center justify-center shadow-md shadow-[#3ac0ff]/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-[#002d59] tracking-tight">Create Talentra Account</h1>
          <p className="text-xs text-slate-500 font-semibold">Join our marketplace and start collaborating today</p>
        </div>

        {/* Card containing register forms */}
        <Card className="p-8 border-slate-200/60 bg-white shadow-xl shadow-[#002d59]/5 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-600">
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
              <label className="block text-xs font-semibold text-slate-600">Account Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole(Role.FREELANCER)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                    role === Role.FREELANCER
                      ? "border-[#3ac0ff] bg-[#3ac0ff]/10 text-[#002d59]"
                      : "border-slate-200 bg-slate-50/50 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                  disabled={loading}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span className="text-xs font-semibold">Freelancer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole(Role.COMPANY)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                    role === Role.COMPANY
                      ? "border-[#3ac0ff] bg-[#3ac0ff]/10 text-[#002d59]"
                      : "border-slate-200 bg-slate-50/50 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                  disabled={loading}
                >
                  <Building className="h-4.5 w-4.5" />
                  <span className="text-xs font-semibold">Company</span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-4 cursor-pointer"
              disabled={loading}
            >
              {loading ? "Registering..." : "Create Account"}
            </Button>
          </form>
        </Card>

        {/* Link back or login */}
        <p className="text-center text-xs text-slate-500 font-medium">
          Already have an account?{" "}
          <Link href="/login" className="text-sky-600 hover:text-sky-700 font-bold">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
