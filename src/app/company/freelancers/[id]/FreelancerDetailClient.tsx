"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Send, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { FreelancerProfileDetail } from "@/components/shared/FreelancerProfileDetail";
import { toggleSaveFreelancer } from "@/actions/savedFreelancerActions";
import type { Certificate, Freelancer, Review } from "@/lib/types";

export function FreelancerDetailClient({
  freelancer,
  reviews,
  certificates,
  saved: savedInitial,
}: {
  freelancer: Freelancer;
  reviews: Review[];
  certificates: Certificate[];
  saved: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(savedInitial);
  const [, startTransition] = useTransition();

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
        reviews={reviews}
        certificates={certificates}
        actions={
          <>
            <Button
              block
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() => router.push(`/company/freelancers?invite=${freelancer.id}`)}
            >
              Invite to a project
            </Button>
            <Button
              block
              variant={saved ? "soft" : "secondary"}
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={() => {
                const wasSaved = saved;
                setSaved(!wasSaved);
                startTransition(async () => {
                  const result = await toggleSaveFreelancer(freelancer.id);
                  if ("error" in result && result.error) {
                    setSaved(wasSaved);
                    toast.toast({ title: result.error, tone: "error" });
                    return;
                  }
                  toast.toast({
                    title: wasSaved ? "Removed from shortlist" : "Saved to shortlist",
                    tone: "success",
                  });
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
