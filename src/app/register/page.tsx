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
        password,
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
    <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-white text-[#1A1D29]">
      <div className="w-full max-w-md space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-10 w-10 rounded-full bg-[#FFF3DC] items-center justify-center text-[#1A1D29]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-normal text-[#1A1D29] tracking-tight">Create Talentra Account</h1>
          <p className="text-xs text-[#5B6272]">Join our marketplace and start collaborating today</p>
        </div>

        {/* Card containing register forms */}
        <Card className="p-8 border-[#E3E5EA] bg-white rounded-lg space-y-6">
          {error && (
            <div className="p-3.5 bg-[#FDEAEA] border border-[#F5C2C2] rounded-lg text-xs font-medium text-[#BC2A2A]">
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
              <label className="block text-xs font-medium text-[#5B6272]">Account Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole(Role.FREELANCER)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-full border transition-all cursor-pointer ${
                    role === Role.FREELANCER
                      ? "border-[#1A1D29] bg-[#152C55] text-white"
                      : "border-[#C7CBD6] bg-[#F8F9FB] text-[#5B6272] hover:bg-[#F0F3F9]"
                  }`}
                  disabled={loading}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span className="text-xs font-medium">Freelancer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole(Role.COMPANY)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-full border transition-all cursor-pointer ${
                    role === Role.COMPANY
                      ? "border-[#1A1D29] bg-[#152C55] text-white"
                      : "border-[#E3E5EA] bg-[#F8F9FB] text-[#5B6272] hover:bg-[#E8F1FE]"
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
        <p className="text-center text-xs text-[#5B6272] font-normal">
          Already have an account?{" "}
          {/* Inline prose link — padding extends the tap target without
              disturbing the sentence's baseline. */}
          <Link
            href="/login"
            className="inline-block py-2 -my-2 font-medium text-[#2159C9] hover:underline"
          >
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}

