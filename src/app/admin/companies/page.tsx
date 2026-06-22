import React from "react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Building2, Globe, MapPin } from "lucide-react";

export default async function AdminCompaniesPage() {
  const companies = await db.company.findMany({
    include: {
      user: {
        select: { name: true, email: true },
      },
      _count: {
        select: { projects: true },
      },
    },
    orderBy: { companyName: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
          Company Directory
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor company industry targets, domains, locations, and posted projects
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {companies.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 text-xs md:col-span-2">
            No company profiles registered yet.
          </Card>
        ) : (
          companies.map((c) => (
            <Card key={c.id} className="p-6 border-slate-100 bg-white shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-[#002d59] flex items-center gap-1.5">
                    <Building2 className="h-4.5 w-4.5 text-[#3ac0ff]" />
                    {c.companyName}
                  </h3>
                  <p className="text-[10px] text-slate-500">Contact: {c.user.name} ({c.user.email})</p>
                </div>
                <Badge variant="primary">{c.industry || "General"}</Badge>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {c.description || "No description provided."}
              </p>

              <div className="grid grid-cols-3 gap-2.5 text-[10px] text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  <span>{c.location || "Remote"}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <Globe className="h-3.5 w-3.5 text-slate-500" />
                  <a href={c.website || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-[#3ac0ff] text-[#002d59] font-medium truncate">
                    {c.website || "No website"}
                  </a>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-xs">
                <span className="text-slate-500">Total Posted Gigs</span>
                <strong className="text-slate-800 font-semibold">{c._count.projects} Listings</strong>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
