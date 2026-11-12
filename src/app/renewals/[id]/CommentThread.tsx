"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Spinner from "@/components/Spinner";
import NoteTemplates from "@/components/NoteTemplates";
import MentionInput from "@/components/MentionInput";

type CommentData = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

type EventData = { id: string; message: string; actorName: string; createdAt: string };
type Filter = "all" | "notes" | "changes";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "notes", label: "Notes" },
  { key: "changes", label: "Changes" },
];
const stamp = (iso: string) => new Date(iso).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" });

/**
 * One timeline for the renewal: people's notes and the system's record of what changed (status moves, edits,
 * allocations), oldest first, with a filter. Writing a note works as before.
 */
export default function CommentThread({
  renewalId,
  initialComments,
  events = [],
}: {
  renewalId: string;
  initialComments: CommentData[];
  events?: EventData[];
}) {
  const [comments, setComments] = useState(initialComments);
  // After a refresh the page passes the full list again (it may hold notes others added): keep ours in step with it.
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);
  const [filter, setFilter] = useState<Filter>("all");
  const listRef = useRef<HTMLDivElement>(null);
  const feed = useMemo(() => {
    const items = [
      ...(filter !== "changes" ? comments.map((c) => ({ kind: "note" as const, at: c.createdAt, c })) : []),
      ...(filter !== "notes" ? events.map((e) => ({ kind: "event" as const, at: e.createdAt, e })) : []),
    ];
    return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [comments, events, filter]);
  // Newest at the bottom, next to the box for writing a note.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed.length]);
  const [body, setBody] = useState("");
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError(null);

    let res: Response;
    let data: any = null;
    try {
      res = await fetch(`/api/renewals/${renewalId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, mentionedUserIds: mentionedIds }),
      });
      data = await res.json().catch(() => null);
    } catch {
      setLoading(false);
      setError("Couldn't reach the server. Your note is still here - try again.");
      return;
    }
    setLoading(false);

    if (!res.ok || !data?.comment) {
      setError(data?.error || "Could not post comment.");
      return;
    }

    const added = {
      id: data.comment.id,
      body: data.comment.body,
      authorName: data.comment.author.name,
      createdAt: data.comment.createdAt,
    };
    setComments((prev) => (prev.some((c) => c.id === added.id) ? prev : [...prev, added]));
    setBody("");
    setMentionedIds([]);
  }

  return (
    <section aria-labelledby="notes-h">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="notes-h" className="sr-only">Activity</h2>
        <span className="text-[0.8125rem] text-slate-500">{feed.length} {feed.length === 1 ? "entry" : "entries"}, oldest first</span>
        <div role="group" aria-label="Filter activity" className="flex gap-4 text-[0.8125rem]">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? "font-medium text-slate-900 underline underline-offset-4 dark:text-slate-50" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={listRef} className="relative mb-4 max-h-[26rem] space-y-4 overflow-y-auto pr-1">
        {feed.map((item, i) =>
          item.kind === "note" ? (
            <article key={`n-${item.c.id}`} className="rs-enter flex gap-3" style={{ animationDelay: `${Math.min(i, 10) * 20}ms` }}>
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.75rem] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {item.c.authorName.trim()[0]?.toUpperCase() ?? "?"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[0.8125rem] font-medium text-slate-900 dark:text-slate-100">{item.c.authorName}</span>
                  <span className="text-[0.75rem] text-slate-500">{stamp(item.c.createdAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-slate-700 dark:text-slate-300">{item.c.body}</p>
              </div>
            </article>
          ) : (
            <div key={`e-${item.e.id}`} className="rs-enter flex gap-3" style={{ animationDelay: `${Math.min(i, 10) * 20}ms` }}>
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center">
                <span className="h-[7px] w-[7px] rounded-full bg-slate-300 dark:bg-slate-600" />
              </span>
              <div className="min-w-0 flex-1 text-[0.8125rem]">
                <p className="text-slate-600 dark:text-slate-400">{item.e.message}</p>
                <p className="mt-0.5 text-[0.75rem] text-slate-500">{stamp(item.e.createdAt)}</p>
              </div>
            </div>
          )
        )}
        {feed.length === 0 && (
          <p className="text-[0.875rem] text-slate-500">
            {filter === "changes" ? "Nothing has changed yet." : "No notes yet. Notes are visible to everyone working on this renewal."}
          </p>
        )}
      </div>

      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-2 focus-within:border-brand-500 dark:border-slate-800 dark:bg-slate-900">
        {error && <p className="alert-error mb-2" role="alert">{error}</p>}
        <MentionInput
          className="block min-h-[72px] w-full resize-y border-0 bg-transparent px-2 py-1.5 text-[0.875rem] text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          placeholder="Add a note. Type @ to mention someone."
          value={body}
          onChange={setBody}
          onMentionsChange={setMentionedIds}
          renewalId={renewalId}
        />
        <div className="flex items-end justify-between gap-3">
          <NoteTemplates value={body} onPick={setBody} />
          <button type="submit" disabled={loading || !body.trim()} aria-busy={loading} className="btn-primary min-h-[34px] px-3 py-1.5 text-[0.8125rem]">
            {loading && <Spinner />}
            {loading ? "Posting…" : "Post note"}
          </button>
        </div>
      </form>
    </section>
  );
}
