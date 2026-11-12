"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUS_CHART_COLORS, STATUS_LABELS } from "@/lib/statusFlow";
import { plainStatusLabel } from "@/lib/plainWords";
import { dueChip, dueTone } from "@/lib/deadlines";
import { RefreshIcon } from "@/components/icons";
import type { BoardCard, BoardData } from "@/lib/board";

// These need extra details (a quote amount, or what really happened), so they open the renewal instead.
const NEEDS_FORM = ["QUOTED", "RENEWED", "CANCELLED", "LAPSED"];
const money = (v: number) => v.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });

/**
 * Renewals by stage, five columns that fit the screen (they stack on a phone) so nothing scrolls. Each column
 * shows the ones due soonest; "See all" opens the full list. Drag a card to the next column to move it one step
 * (on a phone, or with the keyboard, use the button on the card). The server checks the rules again.
 */
export default function PipelineBoard({ data, listBase, who }: { data: BoardData; listBase: string; who?: string }) {
  const router = useRouter();
  const lbl = (s: string) => (who ? plainStatusLabel(s, who) : STATUS_LABELS[s]);
  const [columns, setColumns] = useState(data.columns);
  const [refreshing, startRefresh] = useTransition();
  // New data from the server (after Refresh) replaces what is shown.
  useEffect(() => setColumns(data.columns), [data]);
  const [dragging, setDragging] = useState<BoardCard | null>(null);
  const [over, setOver] = useState<string | null>(null);
  // Cards with a move in flight (several can be moving at once).
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const isBusy = (id: string) => busyIds.has(id);
  const markBusy = (id: string, on: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);

  async function move(card: BoardCard, target: string) {
    setMsg(null);
    if (!card.allowed.includes(target)) {
      setMsg({ text: `${card.clientName} can't go to ${lbl(target)} from here. Renewals move one step at a time.`, bad: true });
      return;
    }
    if (NEEDS_FORM.includes(target)) {
      router.push(`/renewals/${card.id}`);
      return;
    }
    markBusy(card.id, true);
    let res: Response;
    try {
      res = await fetch(`/api/renewals/${card.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: target }) });
    } catch {
      markBusy(card.id, false);
      setMsg({ text: "Couldn't reach the server. Check your connection and try again.", bad: true });
      return;
    }
    markBusy(card.id, false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setMsg({ text: body?.error || "Couldn't move it.", bad: true });
      return;
    }
    setColumns((cols) =>
      cols.map((c) =>
        c.status === card.status ? { ...c, total: c.total - 1, cards: c.cards.filter((x) => x.id !== card.id) } : c.status === target ? { ...c, total: c.total + 1 } : c
      )
    );
    setMsg({ text: `${card.clientName} moved to ${lbl(target)}.`, bad: false });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div role="status" aria-live="polite" className="min-h-[1.5rem] text-[0.875rem]">
          {msg && <span className={`rs-enter inline-block ${msg.bad ? "text-[#a33a2c] dark:text-[#eda499]" : "text-brand-700 dark:text-brand-300"}`}>{msg.text}</span>}
        </div>
        <button
          type="button"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={refreshing}
          aria-busy={refreshing}
          className="btn-secondary shrink-0"
          title="Load the latest changes from everyone"
        >
          <RefreshIcon size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {columns.map((col) => {
          const droppable = !!dragging && dragging.allowed.includes(col.status);
          return (
            <section
              key={col.status}
              aria-label={`${lbl(col.status)}, ${col.total}`}
              onDragOver={(e) => {
                if (droppable) {
                  e.preventDefault();
                  setOver(col.status);
                }
              }}
              onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragging) move(dragging, col.status);
                setDragging(null);
              }}
              className={`flex min-w-0 flex-col rounded-xl border bg-slate-50 p-2 transition-colors dark:bg-slate-900/50 ${
                over === col.status ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : droppable ? "border-dashed border-brand-300 dark:border-brand-700" : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <header className="flex items-center justify-between px-1 pb-2 pt-1">
                <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-slate-800 dark:text-slate-100">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: STATUS_CHART_COLORS[col.status] }} />
                  {lbl(col.status)}
                </span>
                <span className="num text-[0.75rem] text-slate-500">{col.total}</span>
              </header>

              <ul className="space-y-2">
                {col.cards.length === 0 && <li className="px-1 py-5 text-center text-[0.75rem] text-slate-500 dark:text-slate-400">Nothing here</li>}
                {col.cards.map((c, i) => {
                  const next = c.allowed[0];
                  return (
                    <li
                      key={c.id}
                      draggable={c.allowed.length > 0 && !isBusy(c.id)}
                      onDragStart={() => setDragging(c)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      className={`group rs-enter rounded-lg border bg-white p-2.5 text-[0.8125rem] shadow-sm transition-shadow hover:shadow-pop dark:bg-slate-900 ${
                        c.atRisk ? "border-[#ecc9c2] dark:border-[#4a2a24]" : "border-slate-200 dark:border-slate-800"
                      } ${c.allowed.length > 0 ? "cursor-grab active:cursor-grabbing" : ""} ${dragging?.id === c.id ? "opacity-40" : ""} ${isBusy(c.id) ? "animate-pulse" : ""}`}
                      style={{ animationDelay: `${i * 25}ms` }}
                    >
                      <Link href={`/renewals/${c.id}`} className="block truncate font-medium text-slate-900 hover:underline dark:text-slate-50" title={c.clientName}>
                        {c.clientName}
                      </Link>
                      <div className="mt-0.5 truncate text-slate-500">{[c.policyNumber, c.insurer].filter(Boolean).join(" · ") || "No policy details"}</div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        {c.days != null ? <span className={`font-medium ${dueTone(c.days)}`}>{dueChip(c.days)}</span> : <span className="text-slate-500 dark:text-slate-400">No date</span>}
                        {c.invoiceTotal != null && <span className="num text-slate-600 dark:text-slate-300">{money(c.invoiceTotal)}</span>}
                      </div>
                      {next && (
                        <button type="button" onClick={() => move(c, next)} disabled={isBusy(c.id)} className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1 text-[0.75rem] lg:hidden [@media(hover:none)]:!block lg:group-focus-within:block lg:group-hover:block text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                          {NEEDS_FORM.includes(next) ? `Open to mark ${lbl(next)}` : `Move to ${lbl(next)}`}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              {col.total > col.cards.length && (
                <Link href={`${listBase}?status=${col.status}`} className="mt-2 px-1 py-1 text-[0.8125rem] font-medium text-brand-700 hover:underline dark:text-brand-300">
                  See all {col.total}
                </Link>
              )}
            </section>
          );
        })}
      </div>

      <section aria-label="Finished in the last 60 days" className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-slate-200 pt-4 text-[0.875rem] dark:border-slate-800">
        <span className="text-slate-500">Finished in the last 60 days</span>
        {data.closed.map((c) => (
          <Link key={c.status} href={`${listBase}?status=${c.status}`} className="flex items-center gap-2 hover:underline">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: STATUS_CHART_COLORS[c.status] }} />
            <span className="num font-medium text-slate-900 dark:text-slate-50">{c.count}</span>
            <span className="text-slate-600 dark:text-slate-300">{lbl(c.status)}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
