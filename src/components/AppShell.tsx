"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { navFor, isActive, type NavItem, type Role } from "./Sidebar";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import { MenuIcon, CloseIcon } from "./icons";

/**
 * Frame for every signed-in screen: a slim top bar (wordmark, navigation, notifications, account) so the
 * wide renewal tables get the full width of the screen. On phones the navigation moves into a menu sheet.
 */
function NavDropdown({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = items.some((i) => isActive(i, pathname));
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative flex items-stretch">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`relative flex items-center gap-1 px-2.5 text-[0.875rem] transition-colors ${
          active ? "font-medium text-slate-900 dark:text-slate-50" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        }`}
      >
        {label}
        <span aria-hidden="true" className="text-[0.625rem]">▾</span>
        {active && <span aria-hidden="true" className="absolute inset-x-2.5 -bottom-px h-[2px] rounded-full bg-brand-600 dark:bg-brand-300" />}
      </button>
      {open && (
        <div className="rs-pop absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop dark:border-slate-800 dark:bg-slate-900">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item, pathname) ? "page" : undefined}
              className={`flex min-h-[40px] items-center rounded-lg px-3 text-[0.875rem] ${
                isActive(item, pathname) ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AppShell({
  role,
  name,
  email,
  showExtras = false,
  children,
}: {
  role: Role;
  name: string;
  email: string;
  showExtras?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navFor(role, showExtras);
  // Items with a `section` are folded into one drop-down per section, in the order they first appear.
  const topLevel: ({ item: NavItem } | { label: string; items: NavItem[] })[] = [];
  for (const item of items) {
    if (!item.section) topLevel.push({ item });
    else {
      const existing = topLevel.find((t) => "label" in t && t.label === item.section) as { label: string; items: NavItem[] } | undefined;
      if (existing) existing.items.push(item);
      else topLevel.push({ label: item.section, items: [item] });
    }
  }
  const home = items[0]?.href ?? "/";

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] backdrop-blur dark:border-slate-800">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4 sm:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <MenuIcon size={20} />
          </button>

          <Link href={home} className="flex items-baseline gap-2.5 whitespace-nowrap no-underline">
            <span className="font-serif text-[1.25rem] leading-none tracking-[-0.01em] text-slate-900 dark:text-slate-50">Renewals</span>
            <span className="hidden text-[0.75rem] text-slate-500 dark:text-slate-400 sm:inline">Cactus &amp; Blanket</span>
          </Link>

          <nav aria-label="Main" className="hidden h-full items-stretch gap-1 lg:flex">
            {topLevel.map((entry) =>
              "item" in entry ? (
                <Link
                  key={entry.item.href}
                  href={entry.item.href}
                  aria-current={isActive(entry.item, pathname) ? "page" : undefined}
                  className={`relative flex items-center px-2.5 text-[0.875rem] transition-colors ${
                    isActive(entry.item, pathname)
                      ? "font-medium text-slate-900 dark:text-slate-50"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {entry.item.label}
                  {isActive(entry.item, pathname) && <span aria-hidden="true" className="absolute inset-x-2.5 -bottom-px h-[2px] rounded-full bg-brand-600 dark:bg-brand-300" />}
                </Link>
              ) : (
                <NavDropdown key={entry.label} label={entry.label} items={entry.items} pathname={pathname} />
              )
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell />
            <UserMenu name={name} email={email} role={role} />
          </div>
        </div>
      </header>

      {/* Phone / tablet menu sheet */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="rs-backdrop absolute inset-0 bg-slate-950/40" onClick={() => setOpen(false)} />
          <div className="rs-dialog absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col bg-[color:var(--surface)] shadow-pop">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <span className="font-serif text-[1.25rem] text-slate-900 dark:text-slate-50">Renewals</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Close menu"
              >
                <CloseIcon size={20} />
              </button>
            </div>
            <nav aria-label="Main" className="flex-1 overflow-y-auto p-2">
              {items.map((item, i) => {
                const active = isActive(item, pathname);
                const Icon = item.icon;
                const heading = item.section && items[i - 1]?.section !== item.section ? item.section : null;
                return (
                  <div key={item.href}>
                    {heading && <p className="mx-3 mb-1 mt-4 text-[0.75rem] font-medium uppercase tracking-wide text-slate-500">{heading}</p>}
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-[0.9375rem] ${
                        active
                          ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon size={20} className="shrink-0 opacity-80" />
                      {item.label}
                    </Link>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="rs-enter" key={pathname}>
        {children}
      </div>
    </div>
  );
}
