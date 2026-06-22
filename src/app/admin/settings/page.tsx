import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Shield, Sparkles, Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59] font-sans">
          Platform Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-sans">
          Configure matching factors thresholds and core API settings
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="p-8 bg-white border border-slate-100 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-[#002d59] flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-[#3ac0ff]" />
            AI recommendation Weights
          </h2>

          <div className="space-y-4">
            <Input label="Skill Match Factor Weight (%)" type="number" defaultValue="50" disabled />
            <Input label="Experience Factor Weight (%)" type="number" defaultValue="20" disabled />
            <Input label="Rating Factor Weight (%)" type="number" defaultValue="15" disabled />
            <Input label="Completion Rate Weight (%)" type="number" defaultValue="10" disabled />
            <Input label="Urgency Priority Weight (%)" type="number" defaultValue="5" disabled />
          </div>

          <Button disabled className="w-full">
            Save Weights
          </Button>
        </Card>

        <Card className="p-8 bg-white border border-slate-100 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-[#002d59] flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-[#3ac0ff]" />
            System Configurations
          </h2>

          <div className="space-y-4">
            <Input label="Session Expiry (Seconds)" type="number" defaultValue="86400" disabled />
            <Input label="Max Project Recommendations Returned" type="number" defaultValue="10" disabled />
            <Input label="SMTP Server Domain" placeholder="smtp.sendgrid.net" disabled />
          </div>

          <Button disabled className="w-full">
            Save System configurations
          </Button>
        </Card>
      </div>
    </div>
  );
}
