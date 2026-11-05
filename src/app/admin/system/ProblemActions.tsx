"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** "Mark as dealt with" for one problem or all of them. */
export default function ProblemActions({ id, all = false }: { id?: string; all?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className={all ? "btn-secondary min-h-[34px] text-[0.8125rem]" : "text-[0.8125rem] font-medium text-brand-700 hover:underline disabled:opacity-50 dark:text-brand-300"}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/admin/problems", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(all ? { all: true } : { id }) });
        setBusy(false);
        router.refresh();
      }}
    >
      {all ? "Mark all as dealt with" : "Dealt with"}
    </button>
  );
}
