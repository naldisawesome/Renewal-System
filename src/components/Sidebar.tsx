import type { ComponentType } from "react";
import { HomeIcon, ChartIcon, ListIcon, ShuffleIcon, UploadIcon, UsersIcon, ClipboardIcon,
  SettingsIcon, FolderIcon } from "./icons";

/*
 * What each role can reach. The app frame (AppShell) shows these as the top bar on desktop and as a menu sheet
 * on phones; the routes themselves are protected separately (middleware + page guards), this only decides
 * what is shown.
 */

export type Role = "SUPER_ADMIN" | "ADVISER" | "POLICY_SERVICE_ASSOCIATE" | "UNDERWRITER";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  /** Match only this exact path (used for section home pages). */
  exact?: boolean;
  /** Second group (admin tasks), shown after a divider. */
  group?: "admin";
};

export function navFor(role: Role): NavItem[] {
  if (role === "SUPER_ADMIN") {
    return [
      { href: "/admin", label: "Overview", icon: HomeIcon, exact: true },
      { href: "/admin/dashboard", label: "Dashboard", icon: ChartIcon },
      { href: "/admin/renewals", label: "Renewals", icon: ListIcon },
      { href: "/admin/allocate", label: "Allocate", icon: ShuffleIcon },
      { href: "/admin/upload", label: "Upload", icon: UploadIcon },
      { href: "/admin/reports", label: "Reports", icon: ChartIcon },
      { href: "/admin/users", label: "Users", icon: UsersIcon, group: "admin" },
      { href: "/admin/audit-log", label: "Audit log", icon: ClipboardIcon, group: "admin" },
      { href: "/admin/system", label: "System", icon: SettingsIcon, group: "admin" },
    ];
  }
  if (role === "POLICY_SERVICE_ASSOCIATE") {
    return [{ href: "/admin/renewals", label: "Renewals", icon: ListIcon }];
  }
  const items: NavItem[] = [{ href: "/workspace", label: "My renewals", icon: FolderIcon, exact: true }];
  if (role === "ADVISER") items.push({ href: "/workspace/dashboard", label: "My dashboard", icon: ChartIcon });
  return items;
}

export function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}
