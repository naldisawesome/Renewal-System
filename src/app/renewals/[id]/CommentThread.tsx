"use client";

import { useState } from "react";
import Spinner from "@/components/Spinner";
import MentionInput from "@/components/MentionInput";

type CommentData = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export default function CommentThread({
  renewalId,
  initialComments,
}: {
  renewalId: string;
  initialComments: CommentData[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(data.error || "Could not post comment.");
      return;
    }

    setComments([
      ...comments,
      {
        id: data.comment.id,
        body: data.comment.body,
        authorName: data.comment.author.name,
        createdAt: data.comment.createdAt,
      },
    ]);
    setBody("");
    setMentionedIds([]);
  }

  return (
    <section aria-labelledby="notes-h">
      <h2 id="notes-h" className="section-title mb-3">
        Notes {comments.length > 0 && <span className="font-normal text-slate-500">{comments.length}</span>}
      </h2>

      <div className="mb-4 max-h-[28rem] space-y-4 overflow-y-auto">
        {comments.map((c) => (
          <article key={c.id} className="flex gap-3">
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.75rem] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {c.authorName.trim()[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[0.8125rem] font-medium text-slate-900 dark:text-slate-100">{c.authorName}</span>
                <span className="text-[0.75rem] text-slate-500">
                  {new Date(c.createdAt).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" })}
                </span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-slate-700 dark:text-slate-300">{c.body}</p>
            </div>
          </article>
        ))}
        {comments.length === 0 && <p className="text-[0.875rem] text-slate-500">No notes yet. Notes are visible to everyone working on this renewal.</p>}
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
        <div className="flex justify-end">
          <button type="submit" disabled={loading || !body.trim()} aria-busy={loading} className="btn-primary min-h-[34px] px-3 py-1.5 text-[0.8125rem]">
            {loading && <Spinner />}
            {loading ? "Posting…" : "Post note"}
          </button>
        </div>
      </form>
    </section>
  );
}
