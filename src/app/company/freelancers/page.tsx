"use client";

import { useMemo, useState } from "react";
import { Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { TalentBrowser } from "@/components/shared/TalentBrowser";
import { useSession } from "@/lib/session";
import { getCompanyByUserId, getFreelancer, getProject, projectsForCompany } from "@/data/queries";

export default function CompanyFreelancersPage() {
  const { session } = useSession();
  const toast = useToast();
  const company = session ? getCompanyByUserId(session.userId) : undefined;

  const [againstProjectId, setAgainstProjectId] = useState("");
  const [inviteTarget, setInviteTarget] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [invite, setInvite] = useState({
    projectId: "",
    roleId: "",
    apprentice: false,
    message: "",
  });

  const projects = useMemo(
    () =>
      company
        ? projectsForCompany(company.id).filter(
            (p) => p.status === "OPEN" || p.status === "IN_PROGRESS",
          )
        : [],
    [company],
  );

  const inviteProject = invite.projectId ? getProject(invite.projectId) : undefined;
  const target = inviteTarget ? getFreelancer(inviteTarget) : undefined;
  const selectedRole = inviteProject?.roles.find((r) => r.id === invite.roleId);

  if (!company) return null;

  return (
    <div>
      <PageHeader
        title="Search freelancers"
        description="Filter by skill, discipline, availability and verification. Pick a project to score every candidate against its actual requirements."
      />

      <TalentBrowser
        hrefBase="/company/freelancers"
        againstProjectId={againstProjectId || undefined}
        projectOptions={projects.map((p) => ({ id: p.id, title: p.title }))}
        onProjectChange={setAgainstProjectId}
        cardAction={(id) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              leftIcon={<Send className="h-3.5 w-3.5" />}
              onClick={() => {
                setInviteTarget(id);
                setInvite({
                  projectId: againstProjectId || projects[0]?.id || "",
                  roleId: "",
                  apprentice: false,
                  message: "",
                });
              }}
            >
              Invite
            </Button>
            <Button
              size="sm"
              variant={saved.includes(id) ? "soft" : "secondary"}
              aria-label="Save to shortlist"
              onClick={() => {
                setSaved((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
                toast.toast({
                  title: saved.includes(id) ? "Removed from shortlist" : "Saved to shortlist",
                  tone: "success",
                });
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      />

      <Modal
        open={Boolean(inviteTarget)}
        onClose={() => setInviteTarget(null)}
        title={`Invite ${target?.name} to apply`}
        description="They receive a notification and the invitation appears on their dashboard. An invitation survives whether or not they end up applying."
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                !invite.projectId ||
                (Boolean(inviteProject?.roles.length) && !invite.roleId)
              }
              onClick={() => {
                setInviteTarget(null);
                toast.success("Invitation sent", `${target?.name} has been notified.`);
              }}
            >
              Send invitation
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Project" required>
            <Select
              value={invite.projectId}
              onChange={(e) =>
                setInvite((i) => ({ ...i, projectId: e.target.value, roleId: "" }))
              }
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>

          {inviteProject && inviteProject.roles.length > 0 && (
            <Field
              label="Role"
              required
              help="This project uses roles, so an invitation must name one."
            >
              <Select
                value={invite.roleId}
                onChange={(e) => setInvite((i) => ({ ...i, roleId: e.target.value }))}
              >
                <option value="">Select a role…</option>
                {inviteProject.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.slots - r.hiredCount} of {r.slots} open)
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {selectedRole?.allowApprentice && (
            <Checkbox
              checked={invite.apprentice}
              onChange={(e) => setInvite((i) => ({ ...i, apprentice: e.target.checked }))}
              label="Invite as an apprentice"
              description="Apprentices occupy no slot, so they can be invited even when the role is full."
            />
          )}

          <Field
            label="Personal message"
            help="Invitations that name a specific reason get far better response rates."
          >
            <Textarea
              rows={4}
              value={invite.message}
              onChange={(e) => setInvite((i) => ({ ...i, message: e.target.value }))}
              placeholder="We saw your design systems work and thought of you for the component library half of this engagement…"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
