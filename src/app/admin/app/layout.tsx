import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-guard";
import { AppNav } from "./nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mobile app · Paralokanestham admin", robots: { index: false } };

// Management pages for the mobile app (users, prayer requests, daily prayers, updates, attendance).
export default async function AppAdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login?next=/admin/app");
  return (
    <div className="min-h-screen bg-neutral-100 font-[family-name:var(--font-manrope)] text-neutral-900">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.png" alt="" className="h-8 w-auto" />
          <span className="text-[14px] font-bold">Mobile app</span>
          <Link href="/admin" className="ml-auto rounded-lg border border-neutral-300 px-3 py-1.5 text-[12px] font-semibold hover:bg-neutral-50">
            ← Website editor
          </Link>
        </div>
        <AppNav />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 md:py-6">{children}</main>
    </div>
  );
}
