"use client";

import { useEffect, useState } from "react";

/**
 * The signed-in person's profile photo. It used to travel inside the session cookie (a base64 image on every
 * request); now it is fetched once from /api/account/avatar and shared by every component that shows it.
 */
let cached: string | null | undefined;
let pending: Promise<string | null> | null = null;
const listeners = new Set<(url: string | null) => void>();

function load(): Promise<string | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  pending ??= fetch("/api/account/avatar", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { avatarUrl: null }))
    .then((d) => (cached = d.avatarUrl ?? null))
    .catch(() => (cached = null));
  return pending;
}

export function setMyAvatar(url: string | null) {
  cached = url;
  listeners.forEach((fn) => fn(url));
}

export function useMyAvatar(): string | null {
  const [url, setUrl] = useState<string | null>(cached ?? null);
  useEffect(() => {
    listeners.add(setUrl);
    load().then(setUrl);
    return () => {
      listeners.delete(setUrl);
    };
  }, []);
  return url;
}
