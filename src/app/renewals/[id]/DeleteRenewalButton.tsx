"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

export default function DeleteRenewalButton({
  renewalId,
  clientName,
}: {
  renewalId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Delete the renewal for ${clientName}? This removes its notes and history too. This can't be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/renewals/${renewalId}`, { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Could not delete this renewal.");
      return;
    }

    router.push("/admin/renewals");
    router.refresh();
  }

  return (
    <button onClick={handleDelete} disabled={loading} aria-busy={loading} className="btn-ghost !text-[#a33a2c] hover:!bg-[#f8e9e6] dark:!text-[#eda499] dark:hover:!bg-[#311c19]">
      {loading && <Spinner />}
      {loading ? "Deleting..." : "Delete renewal"}
    </button>
  );
}
