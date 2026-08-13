"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, ShieldCheck, Briefcase, UserCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading("credentials");
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid credentials. Please try again.");
      } else {
        router.refresh();
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(null);
    }
  };

  const handleQuickLogin = async (roleEmail: string, rolePass: string, key: string) => {
    setError("");
    setLoading(key);
    try {
      const res = await signIn("credentials", {
        email: roleEmail,
        password: rolePass,
        redirect: false,
      });

      if (res?.error) {
        setError("Quick login failed.");
      } else {
        router.refresh();
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading("google");
    try {
      await signIn("google");
    } catch (err) {
      console.error(err);
      setLoading(null);
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
          <h1 className="text-2xl font-normal text-[#181d26] tracking-tight">Welcome to Talentra</h1>
          <p className="text-xs text-[#333840]">Sign in to manage your projects or find matched tasks</p>
        </div>

        {/* Card containing login forms */}
        <Card className="p-8 border-[#E2E5EA] bg-white rounded-[12px] shadow-xs space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-[6px] text-xs font-medium text-rose-600">
              {error}
            </div>
          )}

          {/* Manual forms login */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!loading}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!!loading}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2 cursor-pointer"
              disabled={!!loading}
            >
              {loading === "credentials" ? "Signing In..." : "Sign In with Credentials"}
            </Button>
          </form>

          {/* OR divider */}
          <div className="flex items-center gap-4 text-xs font-medium text-[#5A6472]">
            <div className="h-[1px] bg-[#E2E5EA] flex-1" />
            <span>OR CONTINUE WITH</span>
            <div className="h-[1px] bg-[#E2E5EA] flex-1" />
          </div>

          {/* Google Login Button */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full gap-2 border-[#E2E5EA] hover:bg-[#F7F8FA] text-[#181d26] cursor-pointer"
            disabled={!!loading}
          >
            {loading === "google" ? (
              "Connecting..."
            ) : (
              <>
                <svg className="h-4 w-4 mr-1 fill-current text-[#181d26]" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" stroke="none" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Sign In with Google
              </>
            )}
          </Button>

          {/* Quick Demo Testing Drawer */}
          <div className="border-t border-[#E2E5EA] pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-[#5A6472] tracking-wider uppercase">
                Developer Demo Portals
              </span>
              <Badge variant="secondary" className="text-[9px]">
                One-Click Login
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("admin@skillmatch.ai", "admin123", "admin")
                }
                disabled={!!loading}
                className="flex flex-col items-center justify-center p-2.5 rounded-[6px] border border-[#E2E5EA] bg-[#F7F8FA] hover:bg-[#EDEFF2] text-[#181d26] transition-all cursor-pointer"
              >
                <ShieldCheck className="h-4.5 w-4.5 text-[#181d26] mb-1" />
                <span className="text-[9px] font-medium">Admin</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("company.quantum@skillmatch.ai", "company123", "company")
                }
                disabled={!!loading}
                className="flex flex-col items-center justify-center p-2.5 rounded-[6px] border border-[#E2E5EA] bg-[#F7F8FA] hover:bg-[#EDEFF2] text-[#181d26] transition-all cursor-pointer"
              >
                <Briefcase className="h-4.5 w-4.5 text-[#181d26] mb-1" />
                <span className="text-[9px] font-medium">Company</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("freelancer.jane@skillmatch.ai", "freelancer123", "freelancer")
                }
                disabled={!!loading}
                className="flex flex-col items-center justify-center p-2.5 rounded-[6px] border border-[#E2E5EA] bg-[#F7F8FA] hover:bg-[#EDEFF2] text-[#181d26] transition-all cursor-pointer"
              >
                <UserCircle className="h-4.5 w-4.5 text-[#181d26] mb-1" />
                <span className="text-[9px] font-medium">Freelancer</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Link back or registration */}
        <p className="text-center text-xs text-[#333840] font-normal">
          Do not have an account?{" "}
          <Link href="/register" className="text-[#1968E5] hover:underline font-medium">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

