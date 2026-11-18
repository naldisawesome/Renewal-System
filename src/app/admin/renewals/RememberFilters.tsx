"use client";

import { useEffect } from "react";

import { rememberedQuery, saveFilterMemory } from "@/lib/filterMemory";

/**
 * Remembers the filters on All renewals (in this browser) so the list opens the way you left it.
 * Clearing the filters clears the memory too. Renders nothing.
 *
 * Any link on the page that leads to another set of filters (removing a chip, the due-date stops, Clear filters)
 * saves its filters at the moment it is clicked, before the page is fetched, so the old filters never come back.
 */
export default function RememberFilters({ current }: { current: { [key: string]: string | undefined } }) {
  const qs = rememberedQuery(current);
  useEffect(() => saveFilterMemory(qs), [qs]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const url = new URL(a.href, location.href);
      if (url.origin === location.origin && url.pathname === "/admin/renewals") saveFilterMemory(rememberedQuery(url.searchParams));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
