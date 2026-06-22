import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/Button";
import { Sparkles } from "lucide-react";

export async function Navbar() {
  const session = await auth();

  const dashboardLink = session?.user?.role
    ? `/${session.user.role.toLowerCase()}/dashboard`
    : "/login";

  return (
    <header className="glass-navbar sticky top-0 z-50 w-full transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-16.5 flex items-center justify-between">
        {/* Branding */}
        <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
          <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-tr from-[#002d59] to-[#3ac0ff] flex items-center justify-center shadow-md shadow-[#3ac0ff]/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-bold text-[#002d59] tracking-tight text-lg">Talentra</span>
        </Link>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          {!session?.user ? (
            <>
              <Link href="/features" className="hover:text-[#002d59] transition-colors">Features</Link>
              <Link href="/about" className="hover:text-[#002d59] transition-colors">About Us</Link>
              <Link href="/contact" className="hover:text-[#002d59] transition-colors">Contact</Link>
            </>
          ) : session.user.role === "FREELANCER" ? (
            <>
              <Link href="/freelancer/dashboard" className="hover:text-[#002d59] transition-colors">Dashboard</Link>
              <Link href="/freelancer/projects" className="hover:text-[#002d59] transition-colors">Browse Projects</Link>
              <Link href="/freelancer/applications" className="hover:text-[#002d59] transition-colors">Track Applications</Link>
              <Link href="/freelancer/profile" className="hover:text-[#002d59] transition-colors">My Profile</Link>
            </>
          ) : session.user.role === "COMPANY" ? (
            <>
              <Link href="/company/dashboard" className="hover:text-[#002d59] transition-colors">Dashboard</Link>
              <Link href="/company/projects/new" className="hover:text-[#002d59] transition-colors">Post a Gig</Link>
              <Link href="/company/projects" className="hover:text-[#002d59] transition-colors">Manage Gigs</Link>
              <Link href="/company/applicants" className="hover:text-[#002d59] transition-colors">Applicants</Link>
              <Link href="/company/profile" className="hover:text-[#002d59] transition-colors">My Profile</Link>
            </>
          ) : (
            <>
              <Link href="/admin/dashboard" className="hover:text-[#002d59] transition-colors">Admin Dashboard</Link>
              <Link href="/admin/users" className="hover:text-[#002d59] transition-colors">Users</Link>
              <Link href="/admin/projects" className="hover:text-[#002d59] transition-colors">Projects</Link>
            </>
          )}
        </nav>

        {/* Auth / Dashboard */}
        <div className="flex items-center gap-4.5">
          {session?.user ? (
            <>
              <NotificationCenter />
              <Link href={dashboardLink}>
                <Button size="sm" variant="outline">
                  Go to Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-[#002d59] transition-colors">
                Log In
              </Link>
              <Link href="/register">
                <Button size="sm" variant="primary">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
