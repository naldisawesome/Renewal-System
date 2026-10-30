"use client";

import { useEffect } from "react";
import { CheckIcon, CloseIcon, AlertIcon } from "./icons";

export default function Toast({
  message,
  kind = "success",
  onClose,
}: {
  message: string;
  kind?: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast-enter fixed right-4 top-[4.5rem] z-[60]" role="status" aria-live="polite">
      <div className="flex max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white py-3 pl-3 pr-2 shadow-pop dark:border-slate-800 dark:bg-slate-900">
        <span
          className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
            kind === "success" ? "bg-brand-600 text-white dark:bg-brand-300 dark:text-slate-950" : "bg-[#a33a2c] text-white"
          }`}
        >
          {kind === "success" ? <CheckIcon size={12} /> : <AlertIcon size={12} />}
        </span>
        <p className="flex-1 text-[0.875rem] leading-snug text-slate-800 dark:text-slate-100">{message}</p>
        <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Dismiss">
          <CloseIcon size={14} />
        </button>
      </div>
    </div>
  );
}
