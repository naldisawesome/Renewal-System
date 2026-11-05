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
  group?: "admin" | "more";
  /** Menu this item sits under (shown as a drop-down on desktop). Items without one are plain links. */
  section?: string;
  /** Other paths that count as being on this item. */
  alsoActive?: string[];
};

export function navFor(role: Role, showExtras = false): NavItem[] {
  if (role === "SUPER_ADMIN") {
    return [
      { href: "/admin", label: "Overview", icon: HomeIcon, exact: true },
      { href: "/admin/renewals", label: "All renewals", icon: ListIcon, section: "Renewals" },
      { href: "/admin/board", label: "Board", icon: ClipboardIcon, section: "Renewals" },
      { href: "/admin/allocate", label: "Allocate", icon: ShuffleIcon, section: "Renewals" },
      { href: "/admin/upload", label: "Upload", icon: UploadIcon, section: "Renewals" },
      { href: "/admin/dashboard", label: "Dashboard", icon: ChartIcon, section: "Insights" },
      { href: "/admin/reports", label: "Reports", icon: ChartIcon, section: "Insights" },
      { href: "/admin/users", label: "Users", icon: UsersIcon, section: "Admin" },
      { href: "/admin/audit-log", label: "Audit log", icon: ClipboardIcon, section: "Admin" },
      { href: "/admin/system", label: "System", icon: SettingsIcon, section: "Admin" },
    ];
  }
  if (role === "POLICY_SERVICE_ASSOCIATE") {
    return [{ href: "/admin/renewals", label: "Renewals", icon: ListIcon }];
  }
  const items: NavItem[] = [{ href: "/workspace", label: "My renewals", icon: FolderIcon, exact: true }];
  items.push({ href: "/workspace/board", label: "Board & calendar", icon: ClipboardIcon, alsoActive: ["/workspace/calendar"] });
  if (role === "ADVISER") items.push({ href: "/workspace/dashboard", label: "My dashboard", icon: ChartIcon });
  return items;
}

export function isActive(item: NavItem, pathname: string) {
  const on = (h: string) => pathname === h || pathname.startsWith(h + "/");
  return item.exact ? pathname === item.href : on(item.href) || !!item.alsoActive?.some(on);
}
