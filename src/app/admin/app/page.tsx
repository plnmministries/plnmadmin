import Link from "next/link";
import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { Card, Pill, Stat, fmt } from "./ui";
import { SyncButton } from "./sync-button";

export default async function Overview() {
  await appReady();
  const sql = db();
  const [users, open, prayers, lastPrayer, notifs, checkedIn, volunteerReqs, verse] = await Promise.all([
    sql`select count(*)::int as n, count(*) filter (where role = 'volunteer')::int as volunteers, count(*) filter (where role = 'admin')::int as admins, count(*) filter (where created_at > now() - interval '7 days')::int as week from app_users`,
    sql`select count(*)::int as n from app_prayer_requests where status = 'new'`,
    sql`select count(*)::int as n from app_daily_prayers where not hidden`,
    sql`select title, for_date::text as for_date, notified_at, source from app_daily_prayers where not hidden order by for_date desc, id desc limit 1`,
    sql`select kind, title, audience, sent_count, sent_at from app_notifications order by sent_at desc limit 8`,
    sql`select count(*)::int as n from app_attendance where check_out_at is null`,
    sql`select count(*)::int as n from app_volunteer_requests where status = 'pending'`,
    sql`select text, reference, created_at from app_verses order by id desc limit 1`,
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
        <Card title="Volunteer requests" right={<Link href="/admin/app/volunteers" className="text-[12.5px] font-semibold text-sky-700">Review →</Link>}>
          <p className="text-[13px] text-neutral-600">
            {Number(volunteerReqs[0].n) ? <b>{Number(volunteerReqs[0].n)} waiting for approval</b> : "No one is waiting."} Members ask from the app; approving makes them a volunteer.
          </p>
        </Card>
        <Card title="Word for today" right={<Link href="/admin/app/verse" className="text-[12.5px] font-semibold text-sky-700">Change →</Link>}>
          {verse[0] ? (
            <p className="text-[13px] text-neutral-700">
              “{(verse[0].text as string).slice(0, 140)}” <span className="text-neutral-500">· {verse[0].reference as string}</span>
            </p>
          ) : (
            <p className="text-[13px] text-neutral-500">Not set: the app shows its automatic daily verse.</p>
          )}
        </Card>
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
            New “Daily Word” videos are picked up from YouTube automatically (every 10 minutes in the morning, hourly otherwise) and everyone is notified. Use the button for a sudden change.
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
