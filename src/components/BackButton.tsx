"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "./icons";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="-ml-2 mb-4 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      <ArrowLeftIcon size={16} />
      Back
    </button>
  );
}
