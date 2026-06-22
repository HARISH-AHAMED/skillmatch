import React from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BrainCircuit, Laptop, Sparkles, Filter, BellRing, Trophy } from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-16">
          <Badge variant="primary" className="mb-3">Platform Features</Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            How Talentra Redefines Hiring
          </h1>
          <p className="text-slate-400 text-sm mt-3 max-w-xl mx-auto">
            Leverage advanced mathematical scoring models to instantly bridge the gap between job listings and freelancer skill profiles.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="p-8 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Matching Algorithms</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Analyzes skills (50%), experience requirements (20%), ratings (15%), project completions (10%), and urgency factors (5%) to calculate match percentages.
            </p>
          </Card>

          <Card className="p-8 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
              <Laptop className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Tailored Gateways</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Companies can post listings and evaluate ranked lists, freelancers can track their applications, and admins monitor reviews and platform logs.
            </p>
          </Card>

          <Card className="p-8 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <Filter className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Granular Filters</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Quickly locate relevant matches utilizing robust search matrices incorporating skills, rating scale ranges, budgets, and priority tags.
            </p>
          </Card>

          <Card className="p-8 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <BellRing className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Status Notifications</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Receive live alerts regarding application status changes, shortlisting decisions, project assignments, and incoming user ratings.
            </p>
          </Card>

          <Card className="p-8 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Trophy className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Quality Assured</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We verify and index freelancer experience and reviews, computing verified average metrics to secure platform capability.
            </p>
          </Card>

          <Card className="p-8 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Glassmorphism UI</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enjoy a modern user experience with fully responsive translucent card layouts, glowing overlays, and animations.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
