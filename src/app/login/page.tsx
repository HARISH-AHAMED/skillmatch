import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Sign in to FRIVVO to manage your projects, applications, workspace, payments and certificates.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-surface)]" />}>
      <LoginClient />
    </Suspense>
  );
}
