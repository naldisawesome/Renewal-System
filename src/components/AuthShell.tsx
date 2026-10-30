import type { ReactNode } from "react";

// A static month ruler, the same motif as the Overview, as the brand panel's only decoration.
const BARS = [38, 54, 46, 72, 60, 88, 64, 50, 70, 44, 58, 36];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Frame for the signed-out pages: a quiet brand panel on the left (desktop) and the form on the right.
 * On phones the panel collapses to the wordmark above the form.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#16201d] p-14 text-[#e7ece9] lg:flex" aria-hidden="true">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-[1.5rem] tracking-[-0.01em]">Renewals</span>
          <span className="text-[0.8125rem] text-[#9aa39e]">Cactus &amp; Blanket</span>
        </div>

        <div>
          <p className="max-w-md font-serif text-[2.75rem] font-light leading-[1.1] tracking-[-0.02em]">Every renewal, accounted for.</p>
          <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-[#9aa39e]">
            Upload the export, hand renewals to the team, and follow each one from quote to outcome, with notes and a full history along the way.
          </p>
        </div>

        <div>
          <div className="flex h-28 items-end gap-2">
            {BARS.map((h, i) => (
              <span
                key={i}
                className="rs-grow-y flex-1 rounded-[3px]"
                style={{ height: `${h}%`, background: i === 9 ? "#6cc3b2" : "rgb(231 236 233 / 0.14)", animationDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-2 text-[0.6875rem] text-[#6b7570]">
            {MONTHS.map((m) => (
              <span key={m} className="flex-1">
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="flex flex-col bg-[color:var(--surface)]">
        <div className="flex items-baseline gap-2.5 px-6 pt-6 lg:hidden">
          <span className="font-serif text-[1.375rem] text-slate-900 dark:text-slate-50">Renewals</span>
          <span className="text-[0.75rem] text-slate-500">Cactus &amp; Blanket</span>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
          <div className="rs-enter w-full max-w-[24rem]">{children}</div>
        </div>
      </main>
    </div>
  );
}
