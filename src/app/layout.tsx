import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Talentra - Built for Skills, Powered by Opportunity",
  description: "An AI-powered platform that connects companies with skilled professionals through real-world projects, helping talent gain experience, earn credibility, and grow their careers.",
  keywords: "freelance, marketplace, AI recommendations, skill matching, hiring, freelancers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen text-slate-800 antialiased selection:bg-sky-500/30">
        <SessionProvider>
          {children}
          <RealtimeNotifications />
        </SessionProvider>
      </body>
    </html>
  );
}
