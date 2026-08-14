import { StatTileRainbow, DemoCardGrid, SectionEyebrow, TestimonialCardSaturated, FaqAccordion } from "@/components/marketing/MarketingBlocks";
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
    <div className="flex flex-col min-h-screen bg-page-wash text-[#1A1D29]">
      <Navbar />

      <main className="flex-1">
        {/* 1. HERO BAND (White Canvas) */}
        <section className="py-24 px-6 max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 py-1 px-3 bg-[#F8F9FB] text-[#1A1D29] border border-[#E3E5EA]">
            <Sparkles className="h-3.5 w-3.5 mr-2 text-[#1A1D29]" />
            Next-Gen Talent Matching
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-normal text-[#1A1D29] tracking-tight mb-6 max-w-4xl mx-auto leading-[1.15]">
            Production teams in prototype speed. <br className="hidden sm:inline" />
            Where talent meets execution.
          </h1>

          <p className="text-base md:text-lg text-[#5B6272] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
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
          <div className="max-w-xl mx-auto bg-white border border-[#E3E5EA] rounded-lg p-6 text-left">
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2159C9]" />
                <input 
                  type="text" 
                  placeholder="Role (e.g. UX Architect)" 
                  className="w-full h-[44px] pl-10 pr-4 rounded-md border border-[#E3E5EA] text-sm text-[#1A1D29] focus:outline-none focus:border-[#C7CBD6]" 
                  readOnly
                  suppressHydrationWarning={true}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2159C9]" />
                <input 
                  type="text" 
                  placeholder="Location or Remote" 
                  className="w-full h-[44px] pl-10 pr-4 rounded-md border border-[#E3E5EA] text-sm text-[#1A1D29] focus:outline-none focus:border-[#C7CBD6]" 
                  readOnly
                  suppressHydrationWarning={true}
                />
              </div>
            </div>
            <Button variant="primary" className="w-full h-[44px] text-sm font-medium">Search talent pool</Button>
          </div>
        </section>

        {/* 2. LOGO STRIP (Airtable Style) */}
        <section className="border-y border-[#E3E5EA] bg-white py-8 px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-8 text-[#5B6272] text-sm font-medium opacity-80">
            <span>TRUSTED BY LEADING TEAMS</span>
            <span className="font-semibold tracking-wider text-base text-[#1A1D29]">HBO</span>
            <span className="font-semibold tracking-wider text-base text-[#1A1D29]">NETFLIX</span>
            <span className="font-semibold tracking-wider text-base text-[#1A1D29]">AMAZON</span>
            <span className="font-semibold tracking-wider text-base text-[#1A1D29]">TIME</span>
            <span className="font-semibold tracking-wider text-base text-[#1A1D29]">CONDE NAST</span>
          </div>
        </section>

        {/* 3. SIGNATURE CORAL CARD BAND */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="bg-[#EAF1FE] text-ink rounded-lg p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4 text-left">
              <Badge variant="cream" className="text-[#1A1D29] bg-[#FFF3DC]">Signature Platform</Badge>
              <h2 className="text-3xl md:text-4xl font-normal text-ink leading-tight">
                Production apps in prototype speed.
              </h2>
              <p className="text-ink/90 text-sm md:text-base leading-relaxed font-normal">
                Assemble high-performing engineering squads, track project updates in real-time, and manage escrows with total compliance.
              </p>
            </div>
            <div className="shrink-0">
              <Link href="/register">
                <Button variant="secondary" size="lg" className="bg-white text-[#1A1D29] border-none hover:bg-page-wash font-medium px-8 py-4">
                  Explore Enterprise
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 4. MULTI-SURFACE DEMO GRID (Pastels: Cream, Peach, Mint, Forest) */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl font-normal text-[#1A1D29]">
              Architected for Enterprise Scale
            </h2>
            <p className="text-sm text-[#5B6272] max-w-xl mx-auto font-normal">
              A sober, structured platform for talent sourcing, project milestone tracking, and secure financial escrow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1: Cream Pastel Callout */}
            <div className="bg-[#FFF3DC] text-[#1A1D29] rounded-lg p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <Badge variant="primary">50% Skills Weight</Badge>
                <h3 className="text-xl font-normal text-[#1A1D29]">AI Neural Matcher</h3>
                <p className="text-xs text-[#5B6272] leading-relaxed">
                  Automated candidate scoring across key dimensions: skills compatibility, verifications, and historical completion metrics.
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-4 border border-[#E3E5EA]">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Match Confidence</span>
                  <span className="font-semibold text-[#1A1D29]">98.4%</span>
                </div>
                <div className="w-full bg-[#E8F1FE] h-1.5 rounded-lg overflow-hidden">
                  <div className="bg-[#152C55] h-full rounded-lg w-[98%]" />
                </div>
              </div>
            </div>

            {/* Card 2: Signature Forest Card */}
            <div className="bg-[#EAF1FE] text-ink rounded-lg p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <Badge variant="mint">Real-time Sync</Badge>
                <h3 className="text-xl font-normal text-ink">Workspace Collaboration</h3>
                <p className="text-xs text-ink/80 leading-relaxed">
                  Unified communication rooms, direct file versioning, milestone escrow releases, and printable invoice logs.
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-4 border border-[#E3E5EA] text-xs space-y-2">
                <div className="flex items-center gap-2 text-ink">
                  <CheckCircle2 className="h-4 w-4 text-[#2159C9]" />
                  <span>Escrow Budget Locked</span>
                </div>
                <div className="flex items-center gap-2 text-ink">
                  <CheckCircle2 className="h-4 w-4 text-[#2159C9]" />
                  <span>Milestone Approved</span>
                </div>
              </div>
            </div>

            {/* Card 3: Mint / Soft Pastel Card */}
            <div className="bg-page-wash text-[#1A1D29] rounded-lg p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <Badge variant="accent">Role Security</Badge>
                <h3 className="text-xl font-normal text-[#1A1D29]">RBAC Gateways</h3>
                <p className="text-xs text-[#1A1D29]/80 leading-relaxed">
                  Distinct, secured entry points tailored specifically for Corporate Clients, Freelancers, and System Administrators.
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-4 border border-[#E3E5EA] text-xs font-medium text-[#1A1D29]">
                <span>Active Roles: Admin · Company · Freelancer</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. DARK NAVY MID-PAGE CTA CARD */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="bg-[#152C55] text-white rounded-xl p-8 md:p-12 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-normal">
              The path to 10× productivity in your organization.
            </h2>
            <p className="text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
              Start posting projects or listing your freelance services on Talentra today.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <Link href="/register">
                <Button variant="secondary" size="lg" className="bg-white text-[#1A1D29] border-none hover:bg-page-wash px-8 py-4 font-medium">
                  Create account
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 6. LIGHT GRAY CTA BANNER */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="bg-page-wash text-[#1A1D29] rounded-lg p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-normal text-[#1A1D29]">Start building with Talentra</h3>
              <p className="text-xs md:text-sm text-[#5B6272] mt-1">Join thousands of teams scaling their freelance workflows.</p>
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
      {/* Marketing proof bands — tint stats, accent-bordered demo cards,
          saturated testimonials, single-open FAQ (DESIGN-unstop-marketing.md) */}
      <section className="band-sky px-6 py-16">
        <div className="mx-auto max-w-6xl space-y-16">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <StatTileRainbow tone="pink" value="850M+" label="Profiles matched" />
            <StatTileRainbow tone="blue" value="30K+" label="Verified recruiters" />
            <StatTileRainbow tone="marigold" value="6.6M+" label="Applications processed" />
          </div>

          <DemoCardGrid
            items={[
              { title: "Post in minutes", body: "Publish a project with roles, rounds and compensation in one guided flow." },
              { title: "Evaluate fairly", body: "Thirteen evaluation round types, scored on their own tracks." },
              { title: "Fund transparently", body: "Stages, hourly logs, stipends and milestones in one ledger." },
              { title: "Certify the work", body: "Issue verifiable certificates the moment a project completes." },
            ]}
          />

          <div className="space-y-6">
            <SectionEyebrow>Don&apos;t take our word for it</SectionEyebrow>
            <div className="no-scrollbar flex gap-5 overflow-x-auto">
              <TestimonialCardSaturated tone="violet" quote="We filled three roles in a week, and the funding trail was auditable end to end." name="Priya N." title="Head of Talent, Fintech" />
              <TestimonialCardSaturated tone="pink" quote="The evaluation rounds mirrored our real hiring loop instead of forcing us into a template." name="Arun M." title="Engineering Manager" />
              <TestimonialCardSaturated tone="mint" quote="Getting paid per approved milestone removed every awkward invoice conversation." name="Sara K." title="Freelance Designer" />
            </div>
          </div>

          <div className="space-y-6">
            <SectionEyebrow>Frequently asked</SectionEyebrow>
            <FaqAccordion
              items={[
                { q: "Is posting a project free?", a: "Yes. Publishing a project, reviewing applicants and running evaluation rounds are all included." },
                { q: "How does funding work?", a: "Choose fixed price, hourly, milestone, stipend or unpaid. Each has its own funding ledger inside the workspace." },
                { q: "Do freelancers get certificates?", a: "Companies can design a certificate per project and issue it to every hired freelancer on completion." },
              ]}
            />
          </div>
        </div>
      </section>

      <footer className="band-sun border-t-4 border-[#C7CBD6] border-t border-[#E3E5EA] bg-white py-16 px-6 text-[#5B6272]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-6 gap-8 mb-12 text-xs">
          <div className="col-span-2 space-y-3">
            <span className="font-medium text-[#1A1D29] text-base">Talentra</span>
            <p className="text-[#5B6272] text-xs leading-relaxed max-w-xs">
              The editorial workflow platform connecting companies with top-tier freelance experts.
            </p>
          </div>
          <div className="space-y-3">
            <span className="font-medium text-[#1A1D29] block">Platform</span>
            <ul className="space-y-2 text-[#5B6272]">
              <li><Link href="/features" className="hover:text-[#1A1D29]">Neural Matching</Link></li>
              <li><Link href="/features" className="hover:text-[#1A1D29]">Escrow Vault</Link></li>
              <li><Link href="/features" className="hover:text-[#1A1D29]">Workspaces</Link></li>
            </ul>
          </div>
          <div className="space-y-3">
            <span className="font-medium text-[#1A1D29] block">Solutions</span>
            <ul className="space-y-2 text-[#5B6272]">
              <li><Link href="/about" className="hover:text-[#1A1D29]">Enterprise</Link></li>
              <li><Link href="/about" className="hover:text-[#1A1D29]">Startups</Link></li>
              <li><Link href="/about" className="hover:text-[#1A1D29]">Agencies</Link></li>
            </ul>
          </div>
          <div className="space-y-3">
            <span className="font-medium text-[#1A1D29] block">Resources</span>
            <ul className="space-y-2 text-[#5B6272]">
              <li><Link href="/contact" className="hover:text-[#1A1D29]">Documentation</Link></li>
              <li><Link href="/contact" className="hover:text-[#1A1D29]">API Reference</Link></li>
              <li><Link href="/contact" className="hover:text-[#1A1D29]">Support</Link></li>
            </ul>
          </div>
          <div className="space-y-3">
            <span className="font-medium text-[#1A1D29] block">Company</span>
            <ul className="space-y-2 text-[#5B6272]">
              <li><Link href="/about" className="hover:text-[#1A1D29]">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[#1A1D29]">Contact</Link></li>
              <li><Link href="#" className="hover:text-[#1A1D29]">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-[#E3E5EA] flex flex-col sm:flex-row items-center justify-between text-xs text-[#5B6272]">
          <p>© {new Date().getFullYear()} Talentra Inc. All rights reserved.</p>
          <p className="font-mono text-[11px] mt-2 sm:mt-0">Design system inspired by Airtable Editorial Spec</p>
        </div>
      </footer>
    </div>
  );
}

