import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { FOOTER_NAV } from "@/lib/nav";

/* Brand glyphs are inlined: lucide no longer ships brand marks. */
const SOCIALS: { label: string; href: string; path: string }[] = [
  {
    label: "LinkedIn",
    href: "#",
    path: "M4.98 3.5a2.5 2.5 0 1 1-.02 5.001A2.5 2.5 0 0 1 4.98 3.5zM3 21h4V9H3v12zm7 0h4v-6.3c0-1.66.31-3.27 2.37-3.27 2.03 0 2.06 1.9 2.06 3.38V21h4v-7.1c0-3.47-.75-6.14-4.8-6.14-1.95 0-3.26 1.07-3.79 2.08h-.06V8.1H10V21z",
  },
  {
    label: "X",
    href: "#",
    path: "M17.53 3h3.02l-6.6 7.54L21.75 21h-5.9l-4.62-6.04L5.94 21H2.92l7.06-8.07L2.4 3h6.05l4.18 5.52L17.53 3zm-1.06 16.2h1.67L7.6 4.7H5.81l10.66 14.5z",
  },
  {
    label: "GitHub",
    href: "#",
    path: "M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49l-.01-1.72c-2.78.62-3.37-1.37-3.37-1.37-.46-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.28 9.28 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9l-.01 2.82c0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z",
  },
  {
    label: "YouTube",
    href: "#",
    path: "M21.58 7.19a2.51 2.51 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42A2.51 2.51 0 0 0 2.42 7.2 26.2 26.2 0 0 0 2 12a26.2 26.2 0 0 0 .42 4.81 2.51 2.51 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.51 2.51 0 0 0 1.77-1.77A26.2 26.2 0 0 0 22 12a26.2 26.2 0 0 0-.42-4.81zM10 15.02V8.98L15.2 12 10 15.02z",
  },
];

function SocialIcon({ path, label }: { path: string; label: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
      role="img"
      aria-label={label}
    >
      <path d={path} />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="container-wide">
        <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-6 lg:gap-8">
          {/* Brand block */}
          <div className="lg:col-span-2">
            <Logo size={36} />
            <p className="mt-4 max-w-xs text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
              One platform for publishing work, discovering talent by explainable match score, and
              running the whole engagement — contracts, funding, tasks, delivery and verifiable
              certificates — in a single workspace.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {SOCIALS.map(({ label, href, path }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-active)]"
                >
                  <SocialIcon path={path} label={label} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_NAV.map((col) => (
            <nav key={col.title}>
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-[var(--color-border-subtle)] py-6 sm:flex-row sm:items-center">
          <p className="text-[12.5px] text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} FRIVVO. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {[
              { label: "Privacy", href: "/legal/privacy" },
              { label: "Terms", href: "/legal/terms" },
              { label: "Trust & Safety", href: "/trust" },
              { label: "Verify a certificate", href: "/verify" },
            ].map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-[12.5px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
