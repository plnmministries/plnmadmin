import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDraft } from "@/lib/store";
import { isAdmin } from "@/lib/admin-guard";
import Editor from "@/components/admin/Editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Site editor · Paralokanestham", robots: { index: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const { content, hasDraft } = await getDraft();
  // public website address (separate deployment); falls back to this app's own pages
  const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
  return <Editor initial={content} hasDraft={hasDraft} siteUrl={siteUrl} />;
}
