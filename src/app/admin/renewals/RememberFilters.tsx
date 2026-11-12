"use client";

import { useEffect } from "react";

import { FILTER_COOKIE, REMEMBERED_KEYS } from "@/lib/filterMemory";

/**
 * Remembers the filters on All renewals (in this browser) so the list opens the way you left it.
 * Clearing the filters clears the memory too. Renders nothing.
 */
export default function RememberFilters({ current }: { current: { [key: string]: string | undefined } }) {
  const qs = new URLSearchParams(
    REMEMBERED_KEYS.filter((k) => current[k]).map((k) => [k, current[k] as string] as [string, string])
  ).toString();
  useEffect(() => {
    try {
      document.cookie = `${FILTER_COOKIE}=${encodeURIComponent(qs)}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  }, [qs]);
  return null;
}
