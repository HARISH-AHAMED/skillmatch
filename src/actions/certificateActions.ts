"use server";
import { deriveRoleSkills, deriveRoleTitle } from "@/lib/lifecycle";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  CertificateConfig,
  getProjectMetadataDirect,
  getProjectDescriptionText,
  serializeProjectMetadata,
} from "@/lib/workflowHelpers";

/** Short, human-shareable verification code. Ambiguous characters are omitted. */
function generatePublicId(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${out.slice(0, 5)}-${out.slice(5)}`;
}

/**
 * Issue a certificate to a freelancer for a project. The company must own the
 * project and the freelancer must have been hired on it. Details are snapshotted
 * so the certificate keeps saying what it said at issue time.
 */
/**
 * Requirement #13 - the signer block is snapshotted onto the certificate row at
 * issue time, like every other field there: a certificate must keep saying what
 * it said when issued. Every column is nullable, so certificates issued before
 * two-signer support keep rendering from issuerName alone and are never
 * backfilled with invented signers.
 */
function signerSnapshot(config: CertificateConfig | undefined | null) {
  if (!config) return {};
  return {
    signer1Name: config.signatoryName || null,
    signer1Title: config.signatoryDesignation || null,
    signer1SignatureUrl: config.signatureUrl || null,
    signer2Name: config.signatory2Name || null,
    signer2Title: config.signatory2Designation || null,
    signer2SignatureUrl: config.signature2Url || null,
  };
}

export async function issueCertificate(input: {
  projectId: string;
  freelancerId: string;
  roleTitle: string;
  skills: string[];
  durationText?: string;
  summary?: string;
}): Promise<{ success: boolean; publicId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    return { success: false, error: "Unauthorized" };
  }

  const [company, project, freelancer] = await Promise.all([
    db.company.findUnique({ where: { userId: session.user.id } }),
    db.project.findUnique({ where: { id: input.projectId } }),
    db.freelancer.findUnique({
      where: { id: input.freelancerId },
      include: { user: { select: { name: true } } },
    }),
  ]);

  if (!project || !company || project.companyId !== company.id) {
    return { success: false, error: "Unauthorized certificate issue" };
  }
  if (!freelancer) return { success: false, error: "Freelancer not found." };

  /**
   * The rule this function documents — "the freelancer must have been hired on
   * it" — was never actually checked. Ownership of the project was confirmed
   * and the freelancer merely had to exist, so any freelancer id produced a
   * publicly verifiable credential at /verify/{publicId}, for a project they
   * had never worked and that need not even be finished.
   *
   * A certificate attests to a real engagement, so the engagement must exist.
   *
   * Deliberately *not* gated on the project being COMPLETED: this action backs
   * the "Issue a certificate now" override, which exists precisely so a company
   * can credit a freelancer before the automatic issuance at completion. The
   * hire is what the credential asserts, and that is what is checked.
   */
  const engagement = await db.application.findFirst({
    where: { projectId: project.id, freelancerId: freelancer.id, status: "HIRED" },
    select: { id: true },
  });
  if (!engagement) {
    return { success: false, error: "That freelancer was not hired on this project." };
  }

  const existing = await db.certificate.findUnique({
    where: { projectId_freelancerId: { projectId: input.projectId, freelancerId: input.freelancerId } },
  });
  if (existing) return { success: true, publicId: existing.publicId };

  const certificate = await db.certificate.create({
    data: {
      publicId: generatePublicId(),
      projectId: project.id,
      freelancerId: freelancer.id,
      companyId: company.id,
      roleTitle: input.roleTitle,
      skills: input.skills ?? [],
      durationText: input.durationText || null,
      summary: input.summary || null,
      issuerName: company.companyName,
      recipientName: freelancer.user?.name || "Freelancer",
      projectTitle: project.title,
    },
  });

  revalidatePath(`/company/projects/${project.id}`);
  revalidatePath(`/verify/${certificate.publicId}`);

  return { success: true, publicId: certificate.publicId };
}

/** Public lookup for the verification page. Returns null when the code is unknown. */
export async function getCertificateByPublicId(publicId: string) {
  if (!publicId) return null;
  return db.certificate.findUnique({ where: { publicId } });
}

/**
 * Ids the freelancer chose to keep off their public profile. Stored on the
 * freelancer's `certifications` JSON column, which no longer holds the retired
 * self-reported credentials.
 */
export async function getHiddenCertificateIds(freelancerId: string): Promise<string[]> {
  const rec = await db.freelancer.findUnique({
    where: { id: freelancerId },
    select: { certifications: true },
  });
  const raw = rec?.certifications as any;
  return Array.isArray(raw?.hiddenCertificateIds) ? raw.hiddenCertificateIds : [];
}

/**
 * Certificates a freelancer has earned, newest first. Public callers get only
 * the ones the freelancer keeps visible; `includeHidden` is for their own views.
 */
export async function getFreelancerCertificates(
  freelancerId: string,
  options?: { includeHidden?: boolean }
) {
  const certificates = await db.certificate.findMany({
    where: { freelancerId, revokedAt: null },
    orderBy: { issuedAt: "desc" },
  });
  if (options?.includeHidden) return certificates;
  const hidden = await getHiddenCertificateIds(freelancerId);
  return certificates.filter((c) => !hidden.includes(c.id));
}

/** Freelancer toggles whether one of their certificates shows on their profile. */
export async function setCertificateVisibility(certificateId: string, visible: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const certificate = await db.certificate.findUnique({
    where: { id: certificateId },
    include: { freelancer: { select: { id: true, userId: true, certifications: true } } },
  });
  if (!certificate || certificate.freelancer.userId !== session.user.id) {
    return { success: false, error: "Certificate not found" };
  }

  const raw = certificate.freelancer.certifications as any;
  const hidden: string[] = Array.isArray(raw?.hiddenCertificateIds)
    ? raw.hiddenCertificateIds
    : [];
  const next = visible
    ? hidden.filter((id) => id !== certificateId)
    : Array.from(new Set([...hidden, certificateId]));

  await db.freelancer.update({
    where: { id: certificate.freelancer.id },
    data: { certifications: { hiddenCertificateIds: next } },
  });

  revalidatePath("/freelancer/profile");
  revalidatePath(`/freelancers/${certificate.freelancer.id}`);
  return { success: true, visible };
}

/**
 * Issue certificates to every hired freelancer on a completed project, using the
 * template the company designed. Called when a project is marked complete.
 *
 * Returns `needsDesign` when the company opted into certificates but never
 * designed one — the caller nudges them rather than issuing something unstyled.
 */
export async function issueProjectCertificates(
  projectId: string
): Promise<{ issued: number; needsDesign: boolean }> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      company: true,
      applications: {
        where: { status: "HIRED" },
        include: { freelancer: { include: { user: { select: { name: true } } } }, role: true },
      },
    },
  });
  if (!project) return { issued: 0, needsDesign: false };

  const meta = getProjectMetadataDirect(project.description);
  if (!meta.certificateIncluded) return { issued: 0, needsDesign: false };
  if (!meta.certificate) return { issued: 0, needsDesign: true };

  let issued = 0;
  for (const app of project.applications) {
    const existing = await db.certificate.findUnique({
      where: { projectId_freelancerId: { projectId: project.id, freelancerId: app.freelancerId } },
    });
    if (existing) continue;

    /**
     * MF-007 — the title read `role?.title`, a field ProjectRole does not have
     * (it is `name`), so every certificate silently fell through to the generic
     * "Project Contributor". Skills came from `project.requiredSkills`, giving
     * a designer and a backend engineer on the same project identical skill
     * lists.
     *
     * Both now come from the freelancer's actual role, and are only inferred
     * from project-wide data when the project uses no roles at all.
     */
    const role = app.role;
    const roleSkills = deriveRoleSkills(role, project.requiredSkills);

    const certificate = await db.certificate.create({
      data: {
        publicId: generatePublicId(),
        projectId: project.id,
        freelancerId: app.freelancerId,
        companyId: project.companyId,
        roleTitle: deriveRoleTitle(role, app.isApprentice),
        skills: roleSkills,
        issuerName: project.company.companyName,
        ...signerSnapshot(meta.certificate),
        recipientName: app.freelancer.user?.name || "Freelancer",
        projectTitle: project.title,
      },
    });
    issued++;

    await db.notification.create({
      data: {
        userId: app.freelancer.userId,
        title: "Certificate Issued",
        message: `Your certificate for "${project.title}" is ready. Download it from My Certificates.`,
      },
    });
    revalidatePath(`/verify/${certificate.publicId}`);
  }

  revalidatePath("/freelancer/certificates");
  return { issued, needsDesign: false };
}

/**
 * Persist the certificate template a company designed for a project.
 * Designing is deliberately separate from issuing — saving here never marks a
 * certificate as issued, it only stores the template for later use.
 */
export async function saveCertificateDesign(projectId: string, config: CertificateConfig) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const company = await db.company.findUnique({ where: { userId: session.user.id } });
  const project = await db.project.findUnique({ where: { id: projectId } });

  if (!project || !company || project.companyId !== company.id) {
    throw new Error("Unauthorized certificate edit");
  }

  // Merge into the existing metadata block so no unrelated project data is lost.
  const meta = getProjectMetadataDirect(project.description);
  const updated = {
    ...meta,
    certificateIncluded: true,
    certificate: config,
  };

  await db.project.update({
    where: { id: projectId },
    data: {
      description: serializeProjectMetadata(getProjectDescriptionText(project.description), updated),
    },
  });

  revalidatePath(`/company/projects/${projectId}/certificate`);
  revalidatePath("/company/projects");

  return { success: true };
}
