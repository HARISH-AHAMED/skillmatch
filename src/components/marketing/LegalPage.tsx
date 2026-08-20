import Link from "next/link";
import { PageHero } from "./PageHero";
import { formatDate } from "@/lib/utils";

export interface LegalSection {
  id: string;
  heading: string;
  paragraphs: string[];
  list?: string[];
}

/**
 * Shared layout for legal documents: sticky contents rail on the left, prose on
 * the right, with the same vertical rhythm as the rest of the marketing pages.
 */
export function LegalPage({
  eyebrow,
  title,
  summary,
  updatedAt,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} description={summary} />

      <section className="section-y bg-[var(--color-app)]">
        <div className="container-app">
          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:gap-12">
            {/* Contents */}
            <aside className="hidden lg:block">
              <div className="sticky top-[92px]">
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
                  Contents
                </p>
                <nav>
                  <ol className="flex flex-col gap-1.5">
                    {sections.map((s, i) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="flex gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] leading-[1.5] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]"
                        >
                          <span className="shrink-0 tabular-nums text-[var(--color-text-muted)]">
                            {i + 1}.
                          </span>
                          {s.heading}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
            </aside>

            {/* Body */}
            <div className="min-w-0">
              <div className="mb-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <p className="text-[12.5px] text-[var(--color-text-muted)]">
                  Last updated {formatDate(updatedAt, "long")}
                </p>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
                  This is a plain-language document written for the current phase of the product.
                  Where something is not yet built — external payment processing in particular — we
                  say so rather than reserving rights over a thing that does not exist. Questions go
                  to{" "}
                  <Link href="/contact" className="text-[var(--color-link)] hover:underline">
                    our contact page
                  </Link>
                  .
                </p>
              </div>

              <div className="flex flex-col gap-10">
                {sections.map((s, i) => (
                  <section key={s.id} id={s.id} className="scroll-mt-24">
                    <h2 className="text-[19px] font-semibold leading-[1.35] tracking-[-0.012em] text-[var(--color-text-primary)]">
                      <span className="mr-2 text-[var(--color-text-muted)]">{i + 1}.</span>
                      {s.heading}
                    </h2>
                    <div className="mt-3 flex flex-col gap-3.5">
                      {s.paragraphs.map((p, j) => (
                        <p
                          key={j}
                          className="text-[14.5px] leading-[1.75] text-[var(--color-text-secondary)]"
                        >
                          {p}
                        </p>
                      ))}
                      {s.list && (
                        <ul className="flex flex-col gap-2.5 pl-1">
                          {s.list.map((item) => (
                            <li key={item} className="flex items-start gap-3">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
                              <span className="text-[14px] leading-[1.7] text-[var(--color-text-secondary)]">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-12 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <p className="text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
                  Something here unclear or apparently contradictory? Tell us — we would rather fix
                  the wording than argue about it later.{" "}
                  <Link href="/contact" className="font-medium text-[var(--color-link)] hover:underline">
                    Get in touch
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
