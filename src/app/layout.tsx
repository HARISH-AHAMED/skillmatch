import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider, type Session } from "@/lib/session";
import { getViewer } from "@/data/server/context";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://frivvo.com"),
  title: {
    default: "FRIVVO — Hire, deliver and get paid in one workspace",
    template: "%s · FRIVVO",
  },
  description:
    "FRIVVO is the collaboration platform where companies publish work, discover talent by explainable AI match score, hire into named roles, and run the entire engagement — contracts, funded payment stages, tasks, chat, meetings, deliverables and verifiable certificates — inside a single project workspace.",
  keywords: [
    "freelance platform",
    "hire freelancers",
    "project workspace",
    "milestone payments",
    "escrow freelance",
    "verifiable certificates",
    "AI talent matching",
    "remote work platform",
  ],
  applicationName: "FRIVVO",
  authors: [{ name: "FRIVVO" }],
  openGraph: {
    type: "website",
    siteName: "FRIVVO",
    title: "FRIVVO — Hire, deliver and get paid in one workspace",
    description:
      "Publish work, match on explainable scores, hire into roles, fund and release payments on an auditable ledger, and issue verifiable certificates.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FRIVVO — Hire, deliver and get paid in one workspace",
    description:
      "One platform for the whole engagement: matching, contracts, funding, delivery and proof of work.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#101413",
  width: "device-width",
  initialScale: 1,
};

const ORGANISATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "FRIVVO",
  url: "https://frivvo.com",
  description:
    "A collaboration platform for publishing work, discovering talent by match score, and running engagements end to end.",
  sameAs: [],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolved once per request from Auth.js, so every client consumer of
  // useSession() renders against the real session on the first pass.
  const viewer = await getViewer();
  const session: Session | null = viewer
    ? {
        userId: viewer.userId,
        name: viewer.name,
        email: viewer.email,
        role: viewer.role,
        image: viewer.image,
        profileId: viewer.profileId,
        profileHref: viewer.profileHref,
        onboardingComplete: viewer.onboardingComplete,
      }
    : null;

  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANISATION_SCHEMA) }}
        />
        <SessionProvider initialSession={session}>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
