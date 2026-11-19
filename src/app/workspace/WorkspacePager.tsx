import Link from "next/link";

/** "Showing 1–50 of 444" with Previous / Next and page numbers. Keeps every filter in the address. */
export default function WorkspacePager({
  page,
  pageSize,
  total,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  params: { [key: string]: string | undefined };
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const href = (p: number) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") usp.set(k, v);
    if (p > 1) usp.set("page", String(p));
    const s = usp.toString();
    return s ? `/workspace?${s}` : "/workspace";
  };
  // First, last, and two either side of the current page.
  const nums = Array.from(new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2]))
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-[0.8125rem]";
  return (
    <nav aria-label="Pages" className="no-print mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="num text-[0.8125rem] text-slate-500 dark:text-slate-400">
        Showing {from}–{to} of {total}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={href(page - 1)} className={`${btn} text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}>Previous</Link>
          ) : (
            <span className={`${btn} text-slate-400 dark:text-slate-600`}>Previous</span>
          )}
          {nums.map((n, i) => (
            <span key={n} className="flex items-center gap-1">
              {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
              <Link
                href={href(n)}
                aria-current={n === page ? "page" : undefined}
                className={`${btn} num ${n === page ? "bg-brand-600 font-medium text-white dark:bg-brand-500" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              >
                {n}
              </Link>
            </span>
          ))}
          {page < pages ? (
            <Link href={href(page + 1)} className={`${btn} text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}>Next</Link>
          ) : (
            <span className={`${btn} text-slate-400 dark:text-slate-600`}>Next</span>
          )}
        </div>
      )}
    </nav>
  );
}
