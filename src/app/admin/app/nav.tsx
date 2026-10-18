"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["/admin/app", "Dashboard"],
  ["/admin/app/users", "People"],
  ["/admin/app/volunteers", "Volunteer requests"],
  ["/admin/app/attendance", "Attendance"],
  ["/admin/app/prayer-requests", "Prayer requests"],
  ["/admin/app/daily", "Daily prayers"],
  ["/admin/app/verse", "Word for today"],
  ["/admin/app/updates", "Updates"],
  ["/admin/app/notify", "Send notification"],
  ["/admin/editor", "Website editor"],
] as const;

export function AppNav() {
  const path = usePathname();
  return (
    <nav className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2">
      {ITEMS.map(([href, label]) => {
        const active = href === "/admin/app" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
