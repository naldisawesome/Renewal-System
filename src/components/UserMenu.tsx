"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";
import AccountProfileModal from "./AccountProfileModal";
import SettingsModal from "./SettingsModal";
import { LogoutIcon, SettingsIcon, UserIcon } from "./icons";
import { useMyAvatar } from "@/lib/myAvatar";

type Role = "SUPER_ADMIN" | "ADVISER" | "POLICY_SERVICE_ASSOCIATE" | "UNDERWRITER";

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADVISER: "Adviser",
  POLICY_SERVICE_ASSOCIATE: "Policy Service Associate",
  UNDERWRITER: "Underwriter",
};

export default function UserMenu({ name, email, role }: { name: string; email: string; role: Role }) {
  const avatarUrl = useMyAvatar();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"profile" | "settings" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const initial = name?.trim()?.[0]?.toUpperCase() || "?";
  const itemCls =
    "flex min-h-[40px] w-full items-center gap-3 rounded-lg px-3 text-left text-[0.875rem] text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 sm:pr-3"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[0.75rem] font-medium text-white dark:bg-slate-200 dark:text-slate-900">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[10rem] truncate text-[0.875rem] text-slate-700 dark:text-slate-200 sm:block">{name.split(" ")[0]}</span>
      </button>

      {open && (
        <div className="rs-pop absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop dark:border-slate-800 dark:bg-slate-900">
          <div className="px-3 pb-2.5 pt-2">
            <p className="truncate text-[0.9375rem] font-medium text-slate-900 dark:text-slate-100">{name}</p>
            <p className="truncate text-[0.8125rem] text-slate-500">{email}</p>
            <p className="mt-1 text-[0.75rem] text-slate-500">{ROLE_LABELS[role]}</p>
          </div>
          <div className="border-t border-slate-100 pt-1.5 dark:border-slate-800">
            <button type="button" onClick={() => { setModal("profile"); setOpen(false); }} className={itemCls}>
              <UserIcon size={18} className="text-slate-500" />
              Account profile
            </button>
            <button type="button" onClick={() => { setModal("settings"); setOpen(false); }} className={itemCls}>
              <SettingsIcon size={18} className="text-slate-500" />
              Settings
            </button>
          </div>
          <div className="mt-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex min-h-[40px] w-full items-center gap-3 rounded-lg px-3 text-left text-[0.875rem] text-[#a33a2c] transition-colors hover:bg-[#f8e9e6] dark:text-[#eda499] dark:hover:bg-[#311c19]"
            >
              <LogoutIcon size={18} />
              Log out
            </button>
          </div>
        </div>
      )}

      {modal &&
        createPortal(
          modal === "profile" ? (
            <AccountProfileModal name={name} email={email} roleLabel={ROLE_LABELS[role]} onClose={() => setModal(null)} />
          ) : (
            <SettingsModal onClose={() => setModal(null)} />
          ),
          document.body
        )}
    </div>
  );
}
