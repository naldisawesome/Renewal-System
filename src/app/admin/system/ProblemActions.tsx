"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** "Mark as dealt with" for one problem or all of them. */
export default function ProblemActions({ id, all = false }: { id?: string; all?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
    <button
      type="button"
      disabled={busy}
      className={all ? "btn-secondary min-h-[34px] text-[0.8125rem]" : "text-[0.8125rem] font-medium text-brand-700 hover:underline disabled:opacity-50 dark:text-brand-300"}
      onClick={async () => {
        setBusy(true);
        setFailed(false);
        try {
          const res = await fetch("/api/admin/problems", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(all ? { all: true } : { id }) });
          if (!res.ok) setFailed(true);
        } catch {
          setFailed(true);
        }
        setBusy(false);
        router.refresh();
      }}
    >
      {all ? "Mark all as dealt with" : "Dealt with"}
    </button>
    {failed && <span role="alert" className="ml-2 text-[0.75rem] text-[#8a2c1f] dark:text-[#f0a89c]">Didn&apos;t save. Try again.</span>}
    </>
  );
}
