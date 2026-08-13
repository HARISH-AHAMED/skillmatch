import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Target,
  Layers,
  LineChart,
  Briefcase,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Users,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { auth } from "@/auth";

export default async function LandingPage() {
  const session = await auth();

  const dashboardLink = session?.user?.role
    ? `/${session.user.role.toLowerCase()}/dashboard`
    : "/login";

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F8FE] text-[#181D26]">
      <Navbar />

      <main className="flex-1">
        {/* 1. HERO BAND (White Canvas) */}
        <section className="py-24 px-6 max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 py-1 px-3 bg-[#F7F8FA] text-[#181d26] border border-[#E2E5EA]">
            <Sparkles className="h-3.5 w-3.5 mr-2 text-[#181d26]" />
            Next-Gen Talent Matching
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-normal text-[#181d26] tracking-tight mb-6 max-w-4xl mx-auto leading-[1.15]">
            Production teams in prototype speed. <br className="hidden sm:inline" />
            Where talent meets execution.
          </h1>

          <p className="text-base md:text-lg text-[#333840] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Talentra connects top-tier organizations with specialized freelancers through intelligent neural matching. Pure clarity, zero friction.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href={dashboardLink}>
              <Button variant="primary" size="lg" className="w-full sm:w-auto px-8 py-4">
                Get started for free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8 py-4">
                Book demo
              </Button>
            </Link>
          </div>

          {/* Quick Search Card Mockup */}
          <div className="max-w-xl mx-auto bg-white border border-[#E2E5EA] rounded-[12px] p-6 shadow-sm text-left">
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C7CCD4]" />
                <input 
                  type="text" 
                  placeholder="Role (e.g. UX Architect)" 
                  className="w-full h-[44px] pl-10 pr-4 rounded-[6px] border border-[#E2E5EA] text-sm text-[#181d26] focus:outline-none focus:border-[#1968E5]" 
                  readOnly
                  suppressHydrationWarning={true}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C7CCD4]" />
                <input 
                  type="text" 
                  placeholder="Location or Remote" 
                  className="w-full h-[44px] pl-10 pr-4 rounded-[6px] border border-[#E2E5EA] text-sm text-[#181d26] focus:outline-none focus:border-[#1968E5]" 
                  readOnly
                  suppressHydrationWarning={true}
                />
              </div>
            </div>
            <Button variant="primary" className="w-full h-[44px] text-sm font-medium">Search talent pool</Button>
          </div>
        </section>

        {/* 2. LOGO STRIP (Airtable Style) */}
        <section className="border-y border-[#E2E5EA] bg-white py-8 px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-8 text-[#5A6472] text-sm font-medium opacity-80">
            <span>TRUSTED BY LEADING TEAMS</span>
            <span className="font-semibold tracking-wider text-base text-[#181d26]">HBO</span>
            <span className="font-semibold tracking-wider text-base text-[#181d26]">NETFLIX</span>
            <span className="font-semibold tracking-wider text-base text-[#181d26]">AMAZON</span>
            <span className="font-semibold tracking-wider text-base text-[#181d26]">TIME</span>
            <span className="font-semibold tracking-wider text-base text-[#181d26]">CONDE NAST</span>
          </div>
        </section>

        {/* 3. SIGNATURE CORAL CARD BAND */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="bg-[#7C63F1] text-white rounded-[16px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
            <div className="max-w-2xl space-y-4 text-left">
              <Badge variant="cream" className="text-[#181d26] bg-[#FFF7DA]">Signature Platform</Badge>
              <h2 className="text-3xl md:text-4xl font-normal text-white leading-tight">
                Production apps in prototype speed.
              </h2>
              <p className="text-white/90 text-sm md:text-base leading-relaxed font-normal">
                Assemble high-performing engineering squads, track project updates in real-time, and manage escrows with total compliance.
              </p>
            </div>
            <div className="shrink-0">
              <Link href="/register">
                <Button variant="secondary" size="lg" className="bg-white text-[#181d26] border-none hover:bg-[#EDEFF2] font-medium px-8 py-4">
                  Explore Enterprise
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 4. MULTI-SURFACE DEMO GRID (Pastels: Cream, Peach, Mint, Forest) */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl font-normal text-[#181d26]">
              Architected for Enterprise Scale
            </h2>
            <p className="text-sm text-[#333840] max-w-xl mx-auto font-normal">
              A sober, structured platform for talent sourcing, project milestone tracking, and secure financial escrow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1: Cream Pastel Callout */}
            <div className="bg-[#FFF8DE] text-[#181D26] rounded-[16px] p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <Badge variant="primary" className="bg-[#181d26] text-white">50% Skills Weight</Badge>
                <h3 className="text-xl font-normal text-[#181d26]">AI Neural Matcher</h3>
                <p className="text-xs text-[#333840] leading-relaxed">
                  Automated candidate scoring across key dimensions: skills compatibility, verifications, and historical completion metrics.
                </p>
              </div>
              <div className="bg-white/80 rounded-[6px] p-4 border border-[#e0d3bd]">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Match Confidence</span>
                  <span className="font-semibold text-[#181d26]">98.4%</span>
                </div>
                <div className="w-full bg-[#E2E5EA] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#181d26] h-full rounded-full w-[98%]" />
                </div>
              </div>
            </div>

            {/* Card 2: Signature Forest Card */}
            <div className="bg-[#EC5D8E] text-white rounded-[16px] p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <Badge variant="mint" className="bg-white text-[#181D26]">Real-time Sync</Badge>
                <h3 className="text-xl font-normal text-white">Workspace Collaboration</h3>
                <p className="text-xs text-white/80 leading-relaxed">
                  Unified communication rooms, direct file versioning, milestone escrow releases, and printable invoice logs.
                </p>
              </div>
              <div className="bg-white/10 rounded-[6px] p-4 border border-white/20 text-xs space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-4 w-4 text-[#DEF7EB]" />
                  <span>Escrow Budget Locked</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-4 w-4 text-[#DEF7EB]" />
                  <span>Milestone Approved</span>
                </div>
              </div>
            </div>

            {/* Card 3: Mint / Soft Pastel Card */}
            <div className="bg-[#D8F7E7] text-[#181D26] rounded-[16px] p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <Badge variant="accent" className="bg-white text-[#181D26]">Role Security</Badge>
                <h3 className="text-xl font-normal text-[#181D26]">RBAC Gateways</h3>
                <p className="text-xs text-[#181D26]/80 leading-relaxed">
                  Distinct, secured entry points tailored specifically for Corporate Clients, Freelancers, and System Administrators.
                </p>
              </div>
              <div className="bg-white/80 rounded-[6px] p-4 border border-[#8ec7b0] text-xs font-medium text-[#181D26]">
                <span>Active Roles: Admin · Company · Freelancer</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. DARK NAVY MID-PAGE CTA CARD */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="bg-[#181d26] text-white rounded-[12px] p-8 md:p-12 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-normal">
              The path to 10× productivity in your organization.
            </h2>
            <p className="text-sm text-[#C7CCD4] max-w-xl mx-auto leading-relaxed">
              Start posting projects or listing your freelance services on Talentra today.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <Link href="/register">
                <Button variant="secondary" size="lg" className="bg-white text-[#181d26] border-none hover:bg-[#EDEFF2] px-8 py-4 font-medium">
                  Create account
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 6. LIGHT GRAY CTA BANNER */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="bg-[#EDEFF2] text-[#181d26] rounded-[12px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-normal text-[#181d26]">Start building with Talentra</h3>
              <p className="text-xs md:text-sm text-[#333840] mt-1">Join thousands of teams scaling their freelance workflows.</p>
            </div>
            <Link href={dashboardLink}>
              <Button variant="primary" size="lg" className="px-8 py-4">
                Launch Workspace
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* EDITORIAL FOOTER */}
      <footer className="border-t border-[#E2E5EA] bg-white py-16 px-6 text-[#333840]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-6 gap-8 mb-12 text-xs">
          <div className="col-span-2 space-y-3">
            <span className="font-medium text-[#181d26] text-base">Talentra</span>
            <p className="text-[#5A6472] text-xs leading-relaxed max-w-xs">
              The editorial workflow platform connecting companies with top-tier freelance experts.
            </p>
          </div>
          <div className="space-y-3">
            <span className="font-medium text-[#181d26] block">Platform</span>
            <ul className="space-y-2 text-[#5A6472]">
              <li><Link href="/features" className="hover:text-[#181d26]">Neural Matching</Link></li>
              <li><Link href="/features" className="hover:text-[#181d26]">Escrow Vault</Link></li>
              <li><Link href="/features" className="hover:text-[#181d26]">Workspaces</Link></li>
            </ul>
          </div>
          <div className="space-y-3">
            <span className="font-medium text-[#181d26] block">Solutions</span>
            <ul className="space-y-2 text-[#5A6472]">
              <li><Link href="/about" className="hover:text-[#181d26]">Enterprise</Link></li>
              <li><Link href="/about" className="hover:text-[#181d26]">Startups</Link></li>
              <li><Link href="/about" className="hover:text-[#181d26]">Agencies</Link></li>
            </ul>
          </div>
          <div className="space-y-3">
            <span className="font-medium text-[#181d26] block">Resources</span>
            <ul className="space-y-2 text-[#5A6472]">
              <li><Link href="/contact" className="hover:text-[#181d26]">Documentation</Link></li>
              <li><Link href="/contact" className="hover:text-[#181d26]">API Reference</Link></li>
              <li><Link href="/contact" className="hover:text-[#181d26]">Support</Link></li>
            </ul>
          </div>
          <div className="space-y-3">
            <span className="font-medium text-[#181d26] block">Company</span>
            <ul className="space-y-2 text-[#5A6472]">
              <li><Link href="/about" className="hover:text-[#181d26]">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[#181d26]">Contact</Link></li>
              <li><Link href="#" className="hover:text-[#181d26]">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-[#E2E5EA] flex flex-col sm:flex-row items-center justify-between text-xs text-[#5A6472]">
          <p>© {new Date().getFullYear()} Talentra Inc. All rights reserved.</p>
          <p className="font-mono text-[11px] mt-2 sm:mt-0">Design system inspired by Airtable Editorial Spec</p>
        </div>
      </footer>
    </div>
  );
}

