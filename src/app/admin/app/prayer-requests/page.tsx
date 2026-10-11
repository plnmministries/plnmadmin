import Link from "next/link";
import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { replyToRequest } from "../actions";
import { Card, Pill, btnDark, btnLight, fmt, input } from "../ui";

const TABS = [
  ["new", "Waiting"],
  ["praying", "Praying"],
  ["answered", "Answered"],
  ["all", "All"],
] as const;

export default async function PrayerRequests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await appReady();
  const { status = "new" } = await searchParams;
  const sql = db();
  const rows = await sql`
    select r.*, u.name, u.email, u.phone, (select name from app_users a where a.id = r.replied_by) as replied_by_name
    from app_prayer_requests r join app_users u on u.id = r.user_id
    where ${status === "all" ? sql`true` : sql`r.status = ${status}`}
    order by r.created_at desc limit 200`;
  const counts = await sql`select status, count(*)::int as n from app_prayer_requests group by status`;
  const count = (s: string) => Number(counts.find((c) => c.status === s)?.n || 0);
  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`?status=${k}`} className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${status === k ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200"}`}>
            {label} {k !== "all" && <span className="opacity-60">{count(k)}</span>}
          </Link>
        ))}
      </div>
      {rows.length === 0 && <Card><p className="text-[13px] text-neutral-500">Nothing here.</p></Card>}
      {rows.map((r) => (
        <Card key={String(r.id)}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-[13px] font-bold">
                {(r.name as string) || "Unnamed"} <span className="font-normal text-neutral-500">· {r.email as string}{r.phone ? ` · ${r.phone}` : ""}</span>
              </div>
              <div className="text-[11px] text-neutral-500">{fmt(r.created_at)}</div>
            </div>
            <Pill tone={r.status === "new" ? "amber" : r.status === "praying" ? "violet" : "green"}>{r.status as string}</Pill>
          </div>
          <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed">{r.text as string}</p>
          {r.reply && (
            <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-[12.5px]">
              <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                Reply · {(r.replied_by_name as string) || "admin"} · {fmt(r.replied_at)}
              </div>
              <p className="mt-1 whitespace-pre-line">{r.reply as string}</p>
            </div>
          )}
          <form action={replyToRequest} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={String(r.id)} />
            <textarea name="reply" rows={2} placeholder="Write a reply… the person gets it as a notification" className={input} defaultValue="" />
            <div className="flex flex-wrap gap-2">
              <button name="status" value="answered" className={btnDark}>Send reply</button>
              <button name="status" value="praying" className={btnLight}>Mark as praying (no reply)</button>
              {r.phone && (
                <a href={`https://wa.me/${String(r.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className={btnLight}>
                  WhatsApp them
                </a>
              )}
            </div>
          </form>
        </Card>
      ))}
    </div>
  );
}
