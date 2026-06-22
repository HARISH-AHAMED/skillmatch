import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Zap,
  Target,
  Layers,
  LineChart,
  Briefcase,
  MapPin,
} from "lucide-react";

import { auth } from "@/auth";

export default async function LandingPage() {
  const session = await auth();

  const dashboardLink = session?.user?.role
    ? `/${session.user.role.toLowerCase()}/dashboard`
    : "/login";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 bg-gradient-to-b from-[#f4f8ff] to-[#ffffff]">
        {/* Hero Section */}
        <section className="relative pt-16 pb-20 px-6 max-w-7xl mx-auto text-center overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-400/10 rounded-full blur-[120px] pointer-events-none" />
          
          <Badge variant="accent" className="mb-8 py-1.5 px-4.5 bg-[#d0efff] text-[#002d59] border border-sky-300/40 rounded-full font-bold">
            <Sparkles className="h-3.5 w-3.5 mr-2 text-[#002d59]" />
            Next-Gen Talent Matching
          </Badge>

          <h1 className="text-4xl md:text-6xl font-black text-[#002d59] tracking-tight mb-6 max-w-4xl mx-auto leading-[1.2]">
            Where <span className="bg-[#d0efff] px-2 py-0.5 rounded-lg inline-block text-[#002d59]">Talent</span> <br className="sm:hidden" /> Meets <span className="bg-[#d0efff] px-2 py-0.5 rounded-lg inline-block text-[#002d59]">Opportunity</span>
          </h1>

          <p className="text-sm md:text-base text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            Talentra uses advanced neural networks to connect the world&apos;s best freelancers with top-tier corporate projects. Get precise matches, not just keywords.
          </p>

          {/* Search Block mockup based on Screenshot 1 */}
          <div className="max-w-md mx-auto mb-8 bg-white border border-slate-200/70 rounded-3xl p-5 shadow-xl shadow-[#002d59]/5 space-y-4 text-left">
            <div className="relative">
              <Briefcase className="absolute left-4.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Desired role or skill (e.g. UX Designer)" 
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#3ac0ff] focus:ring-2 focus:ring-[#3ac0ff]/20 text-sm text-slate-800" 
                readOnly
                suppressHydrationWarning={true}
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Remote or City" 
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#3ac0ff] focus:ring-2 focus:ring-[#3ac0ff]/20 text-sm text-slate-800" 
                readOnly
                suppressHydrationWarning={true}
              />
            </div>
            <Button className="w-full py-3.5 text-sm" variant="primary">Search</Button>
          </div>

          {/* Go to Dashboard and user group stats */}
          <div className="flex flex-col items-center justify-center gap-4 mb-16">
            <Link href={dashboardLink}>
              <Button variant="secondary" className="gap-2 px-8 py-3 bg-[#3ac0ff] hover:bg-[#1ab5ff] text-[#002d59] font-bold rounded-2xl">
                Go to Dashboard
                <span className="font-bold text-sm">→</span>
              </Button>
            </Link>

            <div className="flex items-center gap-3 mt-4">
              <div className="flex -space-x-2.5">
                <img className="h-8.5 w-8.5 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120" alt="User 1" />
                <img className="h-8.5 w-8.5 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120" alt="User 2" />
                <img className="h-8.5 w-8.5 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120" alt="User 3" />
              </div>
              <span className="text-xs text-[#002d59] font-bold bg-[#d0efff] px-2.5 py-1 rounded-full shadow-sm">+2k</span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">Trusted by 2,000+ top companies</p>
          </div>

          {/* Visual Showcase Card */}
          <div className="mt-12 max-w-4xl mx-auto relative animate-float">
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-400 to-[#002d59] rounded-3xl blur opacity-10" />
            <Card className="relative p-2 bg-white border border-slate-200/60 rounded-3xl shadow-xl shadow-[#002d59]/5" hoverable={false}>
              <div className="bg-slate-50/40 rounded-2xl border border-slate-100 p-8 flex flex-col md:flex-row gap-8 items-center text-left">
                <div className="flex-1 space-y-4">
                  <Badge variant="primary">AI Match: 98.4%</Badge>
                  <h3 className="text-2xl font-bold text-[#002d59]">Marcus Thorne</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    Senior Full-Stack Architect. Matches 100% of required skills including Next.js, TypeScript, and Tailwind CSS. Average completion rate 98% with 5/5 stars.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {["Next.js", "React 19", "TypeScript", "Tailwind CSS"].map((skill) => (
                      <Badge key={skill} variant="neutral">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="w-full md:w-80 bg-white border border-slate-200/70 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Skill Match (50%)</span>
                    <span className="text-[#002d59]">50.0</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#002d59] h-full rounded-full w-[100%]" />
                  </div>

                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Experience Match (20%)</span>
                    <span className="text-[#002d59]">20.0</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#002d59] h-full rounded-full w-[100%]" />
                  </div>

                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Past Ratings (15%)</span>
                    <span className="text-[#002d59]">14.7</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#002d59] h-full rounded-full w-[98%]" />
                  </div>

                  <div className="flex justify-between text-xs border-t border-slate-100 pt-3 font-bold">
                    <span className="text-slate-700">Total Score</span>
                    <span className="text-[#002d59] text-sm">94.7 / 100</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="bg-[#f8faff] border-y border-slate-200/60 py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-3">
                Features
              </Badge>
              <h2 className="text-3xl font-extrabold text-[#002d59]">
                Architected for Modern Teams
              </h2>
              <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto font-medium">
                Discover a freelance platform designed with advanced matching capabilities, beautiful dashboards, and robust tools.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="space-y-4 bg-white border border-slate-200/50">
                <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100">
                  <Target className="h-5 w-5 text-[#002d59]" />
                </div>
                <h3 className="text-lg font-bold text-[#002d59]">AI Scoring Model</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Automatically score freelancers using weight factors: 50% Skills, 20% Experience, 15% Rating, 10% Completion Rate, and 5% Priority.
                </p>
              </Card>

              <Card className="space-y-4 bg-white border border-slate-200/50">
                <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100">
                  <Layers className="h-5 w-5 text-[#002d59]" />
                </div>
                <h3 className="text-lg font-bold text-[#002d59]">Role-Based Gateways</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Tailored dashboards for Admins, Companies, and Freelancers, secured by robust middleware auth handlers.
                </p>
              </Card>

              <Card className="space-y-4 bg-white border border-slate-200/50">
                <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100">
                  <LineChart className="h-5 w-5 text-[#002d59]" />
                </div>
                <h3 className="text-lg font-bold text-[#002d59]">Analytics Insights</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  View interactive SVG-scaled visual trends tracking user growth, project completions, and applicant pipelines.
                </p>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/60 bg-[#f8faff]/50 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Talentra. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/about" className="hover:text-[#002d59] font-medium">About</Link>
            <Link href="/contact" className="hover:text-[#002d59] font-medium">Contact</Link>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400 font-mono">v1.0.0-Beta</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
