"use client";

import { useState } from "react";
import NotesModal from "@/components/NotesModal";
import { MessageIcon } from "@/components/icons";

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
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
          count > 0 ? "text-slate-800 dark:text-slate-100" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        }`}
        title={count > 0 ? `${count} note${count === 1 ? "" : "s"}` : "Add a note"}
        aria-label={count > 0 ? `Notes (${count})` : "Notes"}
      >
        <MessageIcon size={16} />
        {count > 0 && <span className="num">{count}</span>}
      </button>
      {open && (
        <NotesModal renewalId={renewalId} clientName={clientName} onClose={() => setOpen(false)} onCountChange={setCount} />
      )}
    </>
  );
}
