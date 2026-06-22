import React from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full grid md:grid-cols-2 gap-12 items-center">
        {/* Info panel */}
        <div className="space-y-6">
          <Badge variant="accent" className="w-fit">Get in Touch</Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            How Can We Help You?
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            Have questions about our matching engine, custom company billing tiers, or platform features? Send us a message and our team will reply within 12 hours.
          </p>

          <div className="space-y-4 pt-4 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-indigo-400" />
              <span>support@skillmatch.ai</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-indigo-400" />
              <span>+1 (555) 349-9230</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-indigo-400" />
              <span>Austin, Texas, USA</span>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <Card className="p-8 space-y-6">
          <h2 className="text-xl font-bold text-slate-200">Send Message</h2>
          <div className="space-y-4">
            <Input label="Your Name" placeholder="Alex Carter" />
            <Input label="Email Address" type="email" placeholder="alex@gmail.com" />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Message Description</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 glass-input border border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                placeholder="What details are you inquiring about?"
              />
            </div>
            <Button className="w-full">
              Submit Message
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
