"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/Spinner";
import MentionInput from "@/components/MentionInput";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-slate-900">Notes</h2>
            <p className="text-sm text-slate-500">{clientName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {loadingList && (
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <Spinner className="text-slate-400" /> Loading notes...
            </p>
          )}

          {!loadingList &&
            comments?.map((c) => (
              <div key={c.id} className="rounded-md bg-slate-50 px-4 py-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span className="font-medium text-slate-600">{c.authorName}</span>
                  <span>{new Date(c.createdAt).toLocaleString("en-NZ")}</span>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}

          {!loadingList && comments?.length === 0 && !error && (
            <p className="text-sm text-slate-400">No notes yet - add the first one below.</p>
          )}
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
          <div className="flex gap-2">
            <button type="submit" disabled={loading || !body.trim()} className="btn-primary text-sm">
              {loading && <Spinner className="mr-1.5" />}
              {loading ? "Posting..." : "Post note"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary text-sm">
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
