import type { Certificate } from "./types";

/**
 * The factual half of a certificate, split out from the render component so it
 * can be derived on the server as well as the client.
 */
export interface CertificateData {
  recipientName: string;
  projectTitle: string;
  issuerName: string;
  roleTitle: string;
  skills: string[];
  durationText?: string;
  summary?: string;
  issuedAt: string;
  publicId: string;
  signer1Name?: string;
  signer1Title?: string;
  signer2Name?: string;
  signer2Title?: string;
}

export function certificateFrom(c: Certificate): CertificateData {
  return {
    recipientName: c.recipientName,
    projectTitle: c.projectTitle,
    issuerName: c.issuerName,
    roleTitle: c.roleTitle,
    skills: c.skills,
    durationText: c.durationText,
    summary: c.summary,
    issuedAt: c.issuedAt,
    publicId: c.publicId,
    signer1Name: c.signer1Name,
    signer1Title: c.signer1Title,
    signer2Name: c.signer2Name,
    signer2Title: c.signer2Title,
  };
}
