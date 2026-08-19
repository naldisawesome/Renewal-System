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
    <div className="card p-5 space-y-4">
      <h2 className="font-medium text-slate-900 dark:text-slate-100">Notes</h2>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.map((c) => (
          <div key={c.id} className="rounded-md bg-slate-50 dark:bg-slate-800 px-4 py-3">
            <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-1">
              <span className="font-medium text-slate-600 dark:text-slate-300">{c.authorName}</span>
              <span>{new Date(c.createdAt).toLocaleString("en-NZ")}</span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No notes yet.</p>}
      </div>

      <form onSubmit={submit} className="space-y-2">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <MentionInput
          className="input min-h-[80px]"
          placeholder="Add a note for this renewal... (type @ to tag someone)"
          value={body}
          onChange={setBody}
          onMentionsChange={setMentionedIds}
        />
        <button type="submit" disabled={loading || !body.trim()} className="btn-primary text-sm">
          {loading && <Spinner className="mr-1.5" />}
          {loading ? "Posting..." : "Post note"}
        </button>
      </form>
    </div>
  );
}
