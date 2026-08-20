import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterClient } from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Join FRIVVO as a freelancer to find scoped, funded work — or as a company to hire into named roles and run the engagement end to end.",
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-surface)]" />}>
      <RegisterClient />
    </Suspense>
  );
}
