"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium ${
        active
          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </Link>
  );
}

export default function NavBar({
  role,
  name,
  email,
}: {
  role: "SUPER_ADMIN" | "ADVISER" | "POLICY_SERVICE_ASSOCIATE" | "UNDERWRITER";
  name: string;
  email: string;
}) {
  return (
    <header className="bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-slate-900 dark:text-slate-100 mr-4">Renewal System</span>
          {role === "SUPER_ADMIN" && (
            <>
              <NavLink href="/admin">Overview</NavLink>
              <NavLink href="/admin/dashboard">Dashboard</NavLink>
              <NavLink href="/admin/renewals">All Renewals</NavLink>
              <NavLink href="/admin/allocate">Allocate</NavLink>
              <NavLink href="/admin/upload">Upload</NavLink>
              <NavLink href="/admin/users">Users</NavLink>
              <NavLink href="/admin/audit-log">Audit Log</NavLink>
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
          <UserMenu name={name} email={email} role={role} />
        </div>
      </div>
    </header>
  );
}
