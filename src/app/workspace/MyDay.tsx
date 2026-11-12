import Link from "next/link";

/** One line at the top of My renewals: what needs attention today. Each count opens that list. */
export default function MyDay({ overdue, followUps, stuck, toQuote = 0, active }: { overdue: number; followUps: number; stuck: number; /** Underwriters: renewals waiting for their quote. */ toQuote?: number; active: string }) {
  const items = [
    { key: "quote", n: toQuote, label: "waiting for your quote", href: "/workspace?status=NEEDS_QUOTE", tone: "text-brand-700 dark:text-brand-200" },
    { key: "overdue", n: overdue, label: "overdue", href: "/workspace?due=overdue", tone: "text-[#a33a2c] dark:text-[#eda499]" },
    { key: "followup", n: followUps, label: followUps === 1 ? "follow-up today" : "follow-ups today", href: "/workspace?followup=due", tone: "text-[#93561b] dark:text-[#e3b17f]" },
    { key: "stuck", n: stuck, label: "stuck", href: "/workspace?due=stuck", tone: "text-[#80600f] dark:text-[#e2c47c]" },
  ].filter((i) => i.n > 0);

  return (
    <p role="status" aria-label="Needs attention today" className="card mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-[0.9375rem]">
      <span className="text-slate-500 dark:text-slate-400">Today</span>
      {items.length === 0 ? (
        <span className="text-slate-700 dark:text-slate-300">Nothing needs attention.</span>
      ) : (
        items.map((i) => (
          <Link key={i.key} href={active === i.key ? "/workspace" : i.href} aria-current={active === i.key ? "true" : undefined} className={`font-medium underline-offset-4 hover:underline ${i.tone} ${active === i.key ? "underline" : ""}`}>
            {i.n} {i.label}
          </Link>
        ))
      )}
    </p>
  );
}
