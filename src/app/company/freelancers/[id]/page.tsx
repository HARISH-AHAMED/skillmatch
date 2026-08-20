"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { FreelancerProfileDetail } from "@/components/shared/FreelancerProfileDetail";
import { certificatesFor, getFreelancer, reviewsFor } from "@/data/queries";

export default function CompanyFreelancerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(false);

  const freelancer = getFreelancer(id);
  if (!freelancer) notFound();

  return (
    <div className="-mx-4 -my-6 md:-mx-6 md:-my-8 xl:-mx-8">
      <div className="container-wide pt-6">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push("/company/freelancers")}
        >
          Back to search
        </Button>
      </div>

      <FreelancerProfileDetail
        freelancer={freelancer}
        reviews={reviewsFor(freelancer.id)}
        certificates={certificatesFor(freelancer.id)}
        actions={
          <>
            <Button
              block
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() =>
                toast.success("Invitation sent", `${freelancer.name} has been notified.`)
              }
            >
              Invite to a project
            </Button>
            <Button
              block
              variant={saved ? "soft" : "secondary"}
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={() => {
                setSaved((v) => !v);
                toast.toast({
                  title: saved ? "Removed from shortlist" : "Saved to shortlist",
                  tone: "success",
                });
              }}
            >
              {saved ? "On your shortlist" : "Save to shortlist"}
            </Button>
          </>
        }
      />
    </div>
  );
}
