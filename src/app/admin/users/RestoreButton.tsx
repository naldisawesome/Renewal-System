"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

export default function RestoreButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/users/${id}/restore`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not restore.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-[0.75rem] text-[#a33a2c] dark:text-[#eda499]">{error}</span>}
      <button type="button" onClick={restore} disabled={loading} aria-busy={loading} className="btn-secondary min-h-[32px] px-3 py-1.5 text-[0.8125rem]">
        {loading && <Spinner />}
        Restore
      </button>
    </span>
  );
}
