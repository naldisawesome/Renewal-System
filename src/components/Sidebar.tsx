import type { ComponentType } from "react";
import { HomeIcon, ChartIcon, ListIcon, ShuffleIcon, UploadIcon, UsersIcon, ClipboardIcon,
  SettingsIcon, FolderIcon, MessageIcon, ShieldIcon, RefreshIcon } from "./icons";

/*
 * What each role can reach. The app frame (AppShell) shows these in the top bar on desktop and in a menu sheet
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
  /** Paths in alsoActive are matched exactly (used for "/admin", which is a prefix of everything). */
  exactAlso?: boolean;
  /** Feature switches this item belongs to: it is hidden (for everyone but the owner) when all of them are off. */
  features?: string[];
  /** Only the owner sees this item. */
  ownerOnly?: boolean;
};

export function navFor(role: Role, showExtras = false, owner = false): NavItem[] {
  if (role === "SUPER_ADMIN") {
    return [
      { href: "/admin/renewals", label: "Renewals", icon: ListIcon, alsoActive: ["/admin/allocate"] },
      { href: "/admin/board", label: "Board", icon: ClipboardIcon, features: ["board"] },
      { href: "/admin/upload", label: "Upload", icon: UploadIcon, features: ["upload"] },
      { href: "/admin/dashboard", label: "Insights", icon: ChartIcon, features: ["dashboard", "reports"], alsoActive: ["/admin/reports", "/admin"] , exactAlso: true },
      { href: "/admin/users", label: "Users", icon: UsersIcon, section: "Settings" },
      { href: "/admin/announcements", label: "Announcements", icon: MessageIcon, section: "Settings", features: ["announcements"] },
      { href: "/admin/audit-log", label: "Audit log", icon: ShieldIcon, section: "Settings", features: ["audit_log"] },
      { href: "/admin/system", label: "System health", icon: RefreshIcon, section: "Settings", features: ["system_health"] },
      ...(owner ? [{ href: "/admin/features", label: "Feature switches", icon: SettingsIcon, section: "Settings", ownerOnly: true } as NavItem] : []),
    ];
  }
  if (role === "POLICY_SERVICE_ASSOCIATE") {
    return [{ href: "/admin/renewals", label: "Renewals", icon: ListIcon }];
  }
  const items: NavItem[] = [{ href: "/workspace", label: "My renewals", icon: FolderIcon, exact: true }];
  items.push({ href: "/workspace/board", label: "Board", icon: ClipboardIcon, features: ["board"] });
  if (role === "ADVISER") items.push({ href: "/workspace/dashboard", label: "My dashboard", icon: ChartIcon, features: ["dashboard"] });
  return items;
}

export function isActive(item: NavItem, pathname: string) {
  const on = (h: string) => pathname === h || pathname.startsWith(h + "/");
  if (item.exact) return pathname === item.href;
  return on(item.href) || !!item.alsoActive?.some((h) => (item.exactAlso && h === "/admin" ? pathname === h : on(h)));
}
