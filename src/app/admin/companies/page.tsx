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
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1A1D29]">
          Company Directory
        </h1>
        <p className="text-xs text-[#5B6272] font-normal mt-1">
          Monitor company industry targets, domains, locations, and posted projects
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {companies.length === 0 ? (
          <Card className="p-8 text-center text-[#5B6272] text-xs md:col-span-2 border border-[#C7CBD6] rounded-lg">
            No company profiles registered yet.
          </Card>
        ) : (
          companies.map((c) => (
            <Card key={c.id} className="p-6 border border-[#E3E5EA] bg-white rounded-lg space-y-4">
              <div className="flex justify-between items-start border-b border-[#E3E5EA] pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-[#1A1D29] flex items-center gap-1.5">
                    <Building2 className="h-4.5 w-4.5 text-[#2159C9]" />
                    {c.companyName}
                  </h3>
                  <p className="text-[11px] text-[#5B6272]">Contact: {c.user.name} ({c.user.email})</p>
                </div>
                <Badge variant="primary">{c.industry || "General"}</Badge>
              </div>

              <p className="text-xs text-[#5B6272] leading-relaxed">
                {c.description || "No description provided."}
              </p>

              <div className="grid grid-cols-3 gap-2.5 text-[11px] text-[#5B6272] pt-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#5B6272]" />
                  <span>{c.location || "Remote"}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <Globe className="h-3.5 w-3.5 text-[#5B6272]" />
                  <a href={c.website || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-[#2159C9] text-[#1A1D29] font-medium truncate">
                    {c.website || "No website"}
                  </a>
                </div>
              </div>

              <div className="border-t border-[#E3E5EA] pt-3 flex justify-between items-center text-xs">
                <span className="text-[#5B6272]">Total Posted Gigs</span>
                <strong className="text-[#1A1D29] font-semibold">{c._count.projects} Listings</strong>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
