import React from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Compass, Target } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full space-y-12">
        <div className="text-center">
          <Badge variant="primary" className="mb-3">About Us</Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Connecting Talent and Tech
          </h1>
          <p className="text-slate-400 text-sm mt-3 max-w-xl mx-auto">
            Our goal is to build an intelligent, frictionless marketplace where freelancers find great projects and companies build faster.
          </p>
        </div>

        <Card className="p-8 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 mt-1 shrink-0">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Our Vision</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Traditional hiring is broken. Resume screens, search pages, and static filters result in wasted resources and bad matches. We envision a future where skills, ratings, completions, and experience are computed in real-time to curate highly personalized top-10 recommended candidates.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-8 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20 mt-1 shrink-0">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Engineering Philosophy</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                We design and build systems using Next.js 15, PostgreSQL, and strict type safety, delivering clean, glassmorphic layout modules and fast performance metrics.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
