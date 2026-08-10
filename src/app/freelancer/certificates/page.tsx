import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Award, ArrowRight } from "lucide-react";

export default async function FreelancerCertificatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const freelancer = await db.freelancer.findUnique({ where: { userId: session.user.id } });

  const certificates = freelancer
    ? await db.certificate.findMany({
        where: { freelancerId: freelancer.id, revokedAt: null },
        orderBy: { issuedAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#181d26]">My Certificates</h1>
        <p className="mt-1 text-xs text-slate-500">
          Certificates issued to you when a company marked a project complete. Each one is
          independently verifiable and can be downloaded as a PDF.
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card className="p-10 text-center text-xs text-slate-500">
          No certificates yet. They appear here once a company completes a project you were hired on.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {certificates.map((cert) => (
            <Card key={cert.id} className="flex items-start gap-3 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b61c9]/10 text-[#1b61c9]">
                <Award className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-[#181d26]">{cert.projectTitle}</h2>
                <p className="truncate text-[11px] text-slate-500">
                  {cert.roleTitle} • {cert.issuerName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Issued {new Date(cert.issuedAt).toLocaleDateString()} • ID {cert.publicId}
                </p>
                <Link href={`/freelancer/certificates/${cert.publicId}`} className="mt-3 inline-block">
                  <Button size="sm" variant="outline" className="cursor-pointer gap-1">
                    View &amp; Download <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
