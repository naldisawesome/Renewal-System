"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import NotificationBell from "./NotificationBell";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium ${
        active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </Link>
  );
}

export default function NavBar({
  role,
  name,
}: {
  role: "SUPER_ADMIN" | "ADVISER" | "POLICY_SERVICE_ASSOCIATE" | "UNDERWRITER";
  name: string;
}) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-slate-900 mr-4">Renewal System</span>
          {role === "SUPER_ADMIN" && (
            <>
              <NavLink href="/admin">Overview</NavLink>
              <NavLink href="/admin/dashboard">Dashboard</NavLink>
              <NavLink href="/admin/renewals">All Renewals</NavLink>
              <NavLink href="/admin/allocate">Allocate</NavLink>
              <NavLink href="/admin/upload">Upload</NavLink>
              <NavLink href="/admin/users">Users</NavLink>
            </>
          )}
          {(role === "ADVISER" || role === "UNDERWRITER") && (
            <>
              <NavLink href="/workspace">My Renewals</NavLink>
              {role === "ADVISER" && <NavLink href="/workspace/dashboard">Dashboard</NavLink>}
            </>
          )}
          {role === "POLICY_SERVICE_ASSOCIATE" && <NavLink href="/admin/renewals">All Renewals</NavLink>}
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <span className="text-sm text-slate-500">{name}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-secondary text-xs">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
