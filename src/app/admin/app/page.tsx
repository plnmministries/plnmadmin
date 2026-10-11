import Link from "next/link";
import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { Card, Pill, Stat, fmt } from "./ui";
import { SyncButton } from "./sync-button";

export default async function Overview() {
  await appReady();
  const sql = db();
  const [users, open, prayers, lastPrayer, notifs, checkedIn] = await Promise.all([
    sql`select count(*)::int as n, count(*) filter (where role = 'volunteer')::int as volunteers, count(*) filter (where role = 'admin')::int as admins, count(*) filter (where created_at > now() - interval '7 days')::int as week from app_users`,
    sql`select count(*)::int as n from app_prayer_requests where status = 'new'`,
    sql`select count(*)::int as n from app_daily_prayers where not hidden`,
    sql`select title, for_date::text as for_date, notified_at, source from app_daily_prayers where not hidden order by for_date desc, id desc limit 1`,
    sql`select kind, title, audience, sent_count, sent_at from app_notifications order by sent_at desc limit 8`,
    sql`select count(*)::int as n from app_attendance where check_out_at is null`,
  ]);
  const u = users[0];
  const lp = lastPrayer[0];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="App users" value={Number(u.n)} hint={`${u.volunteers} volunteers · ${u.admins} admins · +${u.week} this week`} />
        <Stat label="Open prayer requests" value={Number(open[0].n)} hint="waiting for a reply" />
        <Stat label="Daily prayers" value={Number(prayers[0].n)} hint={lp ? `latest: ${lp.for_date}` : "none yet"} />
        <Stat label="Volunteers checked in" value={Number(checkedIn[0].n)} hint="right now" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Daily prayer" right={<SyncButton />}>
          {lp ? (
            <div className="text-[13px]">
              <div className="font-semibold">{lp.title as string}</div>
              <div className="mt-1 text-neutral-500">
                {lp.for_date as string} · {lp.source === "manual" ? "added by admin" : "from YouTube"} ·{" "}
                {lp.notified_at ? <Pill tone="green">notified {fmt(lp.notified_at)}</Pill> : <Pill tone="amber">not sent yet</Pill>}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-neutral-500">No daily prayers yet. Press “Check YouTube now” or add one under Daily prayers.</p>
          )}
          <p className="mt-3 text-[11.5px] leading-snug text-neutral-500">
            The scheduler checks the channel every 30 minutes for a new “Daily Word” video and notifies everyone. Use the button for a sudden change.
          </p>
          <div className="mt-3 flex gap-2">
            <Link href="/admin/app/daily" className="text-[12px] font-semibold text-sky-700">
              Manage daily prayers →
            </Link>
          </div>
        </Card>
        <Card title="Recent notifications">
          {notifs.length === 0 && <p className="text-[13px] text-neutral-500">Nothing sent yet.</p>}
          <ul className="divide-y divide-neutral-100 text-[12.5px]">
            {notifs.map((n, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{n.title as string}</div>
                  <div className="text-[11px] text-neutral-500">
                    {n.kind as string} · {n.audience as string} · {fmt(n.sent_at)}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-neutral-500">{Number(n.sent_count)} devices</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
