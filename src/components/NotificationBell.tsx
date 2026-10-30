"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "./icons";

type NotificationData = {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  renewal: { id: string; clientName: string };
};

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// How often the bell checks for new notifications while this tab is visible. It also checks straight away
// when the tab comes back into view, and whenever the list is opened.
const POLL_MS = 45_000;

/**
 * Notifications in the top bar. This replaces the old always-open live connection (which kept a server function
 * running and queried the database every 3 seconds for every open tab) with a light check every 45 seconds while
 * the tab is visible - new notes still show up within a minute, at a small fraction of the cost.
 */
export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // offline or a blip - try again next time
    }
  }, []);

  useEffect(() => {
    refresh();
    let timer = window.setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      refresh();
      window.clearInterval(timer);
      timer = window.setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("rs:notifications-changed", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("rs:notifications-changed", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    setOpen((o) => {
      if (!o) refresh();
      return !o;
    });
  }

  function handleClickNotification(n: NotificationData) {
    setOpen(false);
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
    }
    router.push(`/renewals/${n.renewal.id}`);
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      >
        <BellIcon size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[0.625rem] font-semibold leading-none text-white ring-2 ring-[color:var(--paper)] dark:bg-brand-300 dark:text-slate-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="rs-pop absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="text-[0.9375rem] font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-[0.8125rem] font-medium text-brand-700 hover:underline dark:text-brand-300">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[26rem] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClickNotification(n)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span
                  aria-hidden="true"
                  className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand-600 dark:bg-brand-300"}`}
                />
                <span className="min-w-0">
                  <span className={`block text-[0.875rem] leading-snug ${n.read ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                    {n.message}
                  </span>
                  <span className="mt-0.5 block text-[0.75rem] text-slate-500">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
            {notifications.length === 0 && (
              <p className="px-4 py-10 text-center text-[0.875rem] text-slate-500">You&apos;re all caught up.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
