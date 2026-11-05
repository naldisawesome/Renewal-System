"use client";

import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import Spinner from "@/components/Spinner";
import MentionInput from "@/components/MentionInput";
import { CloseIcon } from "./icons";

type CommentData = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export default function NotesModal({
  renewalId,
  clientName,
  onClose,
  onCountChange,
}: {
  renewalId: string;
  clientName: string;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = useState<CommentData[] | null>(null);
  const [body, setBody] = useState("");
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingList(true);
      setError(null);
      try {
        const res = await fetch(`/api/renewals/${renewalId}/comments`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Could not load notes.");
          setComments([]);
          return;
        }
        const mapped = data.comments.map((c: any) => ({
          id: c.id,
          body: c.body,
          authorName: c.author?.name ?? "Deleted user",
          createdAt: c.createdAt,
        }));
        setComments(mapped);
        onCountChange?.(mapped.length);
      } catch {
        if (!cancelled) {
          setError("Could not load notes.");
          setComments([]);
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renewalId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/renewals/${renewalId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, mentionedUserIds: mentionedIds }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not post note.");
      return;
    }

    const next = [
      ...(comments || []),
      {
        id: data.comment.id,
        body: data.comment.body,
        authorName: data.comment.author.name,
        createdAt: data.comment.createdAt,
      },
    ];
    setComments(next);
    onCountChange?.(next.length);
    setBody("");
    setMentionedIds([]);
  }

  // Rendered at the end of the page, not inside the table cell that opened it, so the cell's alignment and
  // no-wrap settings can't leak into the dialog.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center whitespace-normal px-4 text-left">
      <div className="rs-backdrop absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div className="rs-dialog relative w-full rounded-2xl border border-slate-200 bg-white shadow-pop dark:border-slate-800 dark:bg-slate-900 max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[1.375rem] leading-tight text-slate-900 dark:text-slate-50">Notes</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{clientName}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {loadingList && (
            <p className="text-sm text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <Spinner className="text-slate-400 dark:text-slate-500" /> Loading notes...
            </p>
          )}

          {!loadingList &&
            comments?.map((c) => (
              <article key={c.id} className="border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[0.8125rem] font-medium text-slate-900 dark:text-slate-100">{c.authorName}</span>
                  <span className="text-[0.75rem] text-slate-500">
                    {new Date(c.createdAt).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" })}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-slate-700 dark:text-slate-300">{c.body}</p>
              </article>
            ))}

          {!loadingList && comments?.length === 0 && !error && (
            <p className="text-sm text-slate-400 dark:text-slate-500">No notes yet - add the first one below.</p>
          )}
        </div>

        <form onSubmit={submit} className="space-y-2">
          {error && <p className="alert-error" role="alert">{error}</p>}
          <MentionInput
            renewalId={renewalId}
            className="input min-h-[80px] resize-y"
            placeholder="Add a note. Type @ to mention someone."
            value={body}
            onChange={setBody}
            onMentionsChange={setMentionedIds}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={loading || !body.trim()} aria-busy={loading} className="btn-primary">
              {loading && <Spinner />}
              {loading ? "Posting…" : "Post note"}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body);
}
