"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Search, portfolio, book and month for My renewals. Each change goes back to page 1 and keeps the status tab. */
export default function WorkspaceFilters({ months }: { months: { key: string; label: string; count: number }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const typing = useRef(false);
  // Follow the address (Back, Clear filters), but never overwrite what someone is in the middle of typing.
  useEffect(() => {
    if (!typing.current) setQ(params.get("q") ?? "");
  }, [params]);

  function set(next: Record<string, string>) {
    const usp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) (v ? usp.set(k, v) : usp.delete(k));
    usp.delete("page");
    const s = usp.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  }

  // Search as you type: the list updates a moment after typing stops (Enter searches straight away).
  useEffect(() => {
    if (!typing.current) return;
    const t = setTimeout(() => {
      typing.current = false;
      if (q.trim() !== (params.get("q") ?? "")) set({ q: q.trim() });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const company = params.get("company") ?? "";
  const bookType = params.get("bookType") ?? "";
  const month = params.get("month") ?? "";
  const any = !!(params.get("q") || company || bookType || month);

  return (
    <form
      role="search"
      aria-label="Filter my renewals"
      onSubmit={(e) => {
        e.preventDefault();
        typing.current = false;
        if (q.trim() !== (params.get("q") ?? "")) set({ q: q.trim() });
      }}
      className={`no-print mb-4 grid gap-2 sm:grid-cols-2 ${any ? "lg:grid-cols-[minmax(0,1fr)_10rem_14rem_11rem_auto]" : "lg:grid-cols-[minmax(0,1fr)_10rem_14rem_11rem]"}`}
    >
      <label className="sr-only" htmlFor="ws-q">Search client, policy or insurer</label>
      <input
        id="ws-q"
        type="search"
        value={q}
        onChange={(e) => {
          typing.current = true;
          setQ(e.target.value);
        }}
        placeholder="Search client, policy or insurer"
        className="input-sm w-full sm:col-span-2 lg:col-span-1"
      />
      <label className="sr-only" htmlFor="ws-company">Portfolio</label>
      <select id="ws-company" value={company} onChange={(e) => set({ company: e.target.value })} className="input-sm w-full">
        <option value="">Both portfolios</option>
        <option value="CACTUS">Cactus</option>
        <option value="BLANKET">Blanket</option>
      </select>
      <label className="sr-only" htmlFor="ws-book">Book</label>
      <select id="ws-book" value={bookType} onChange={(e) => set({ bookType: e.target.value })} className="input-sm w-full">
        <option value="">Renewals and contract works</option>
        <option value="RENEWALS">Renewals</option>
        <option value="CONTRACT_WORKS">Contract works</option>
      </select>
      <label className="sr-only" htmlFor="ws-month">Renewal month</label>
      <select id="ws-month" value={month} onChange={(e) => set({ month: e.target.value })} className="input-sm w-full">
        <option value="">All months</option>
        {months.map((m) => (
          <option key={m.key} value={m.key}>
            {m.label} ({m.count})
          </option>
        ))}
      </select>
      {any && (
      <button
        type="button"
        onClick={() => { typing.current = false; setQ(""); set({ q: "", company: "", bookType: "", month: "" }); }}
        className="btn-ghost justify-center px-3 py-1.5 text-[0.8125rem]"
      >
        Clear filters
      </button>
      )}
    </form>
  );
}
