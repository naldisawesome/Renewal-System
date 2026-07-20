"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import AccountProfileModal from "./AccountProfileModal";
import SettingsModal from "./SettingsModal";

type Role = "SUPER_ADMIN" | "ADVISER" | "POLICY_SERVICE_ASSOCIATE" | "UNDERWRITER";

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADVISER: "Adviser",
  POLICY_SERVICE_ASSOCIATE: "Policy Service Associate",
  UNDERWRITER: "Underwriter",
};

export default function UserMenu({ name, email, role }: { name: string; email: string; role: Role }) {
  const { data: session } = useSession();
  const avatarUrl = session?.user?.avatarUrl ?? null;
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"profile" | "settings" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = name?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-6 h-6 rounded-full object-cover shrink-0" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
            {initial}
          </span>
        )}
        <span className="text-sm text-slate-700 dark:text-slate-200">{name}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 card shadow-lg z-50 py-1">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{name}</p>
            <p className="text-xs text-slate-400 truncate">{email}</p>
          </div>

          <button
            onClick={() => {
              setModal("profile");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Account Profile
          </button>

          <button
            onClick={() => {
              setModal("settings");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </button>

          <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Log out
            </button>
          </div>
        </div>
      )}

      {modal === "profile" && (
        <AccountProfileModal
          name={name}
          email={email}
          roleLabel={ROLE_LABELS[role]}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "settings" && <SettingsModal onClose={() => setModal(null)} />}
    </div>
  );
}
