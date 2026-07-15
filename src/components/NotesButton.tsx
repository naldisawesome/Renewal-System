"use client";

import { useState } from "react";
import NotesModal from "@/components/NotesModal";

export default function NotesButton({
  renewalId,
  clientName,
  initialCount,
}: {
  renewalId: string;
  clientName: string;
  initialCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        title={count > 0 ? `${count} note${count === 1 ? "" : "s"}` : "Notes"}
        aria-label="Notes"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white text-[10px] leading-none rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <NotesModal
          renewalId={renewalId}
          clientName={clientName}
          onClose={() => setOpen(false)}
          onCountChange={setCount}
        />
      )}
    </>
  );
}
