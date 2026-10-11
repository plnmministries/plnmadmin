import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { todayISO, ytThumb } from "@/lib/util";
import { addDailyPrayer, sendDailyNow, setDailyHidden } from "../actions";
import { Card, Pill, btnDark, fmt, input } from "../ui";
import { SyncButton } from "../sync-button";

export default async function DailyPrayers() {
  await appReady();
  const rows = await db()`
    select p.*, p.for_date::text as for_date, (select count(*)::int from app_prayer_replies r where r.prayer_id = p.id) as replies
    from app_daily_prayers p order by p.for_date desc, p.id desc limit 60`;
  return (
    <div className="space-y-4">
      <Card title="Add a prayer by hand" right={<SyncButton />}>
        <p className="mb-3 text-[11.5px] text-neutral-500">
          Normally nothing to do here: new “Daily Word” videos on the channel are picked up automatically. Use this for a sudden change: any YouTube video (public or unlisted), sent to everyone right away.
        </p>
        <form action={addDailyPrayer} className="grid gap-2 md:grid-cols-[1.4fr_1fr_auto_auto]">
          <input name="url" required placeholder="YouTube link" className={input} />
          <input name="title" placeholder="Title (optional, taken from YouTube)" className={input} />
          <input name="date" type="date" defaultValue={todayISO()} className={input} />
          <label className="flex items-center gap-2 text-[12.5px]">
            <input type="checkbox" name="notify" value="1" defaultChecked className="accent-red-600" /> Notify everyone
          </label>
          <button className={`${btnDark} md:col-span-4 md:justify-self-start`}>Add prayer</button>
        </form>
      </Card>
      <Card title={`${rows.length} daily prayers`}>
        <ul className="divide-y divide-neutral-100">
          {rows.map((p) => (
            <li key={String(p.id)} className={`flex flex-wrap items-center gap-3 py-2.5 ${p.hidden ? "opacity-50" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ytThumb(p.video_id as string, "mq")} alt="" className="h-12 w-20 shrink-0 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{p.title as string}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                  <span>{p.for_date as string}</span>
                  <Pill tone={p.source === "manual" ? "violet" : "neutral"}>{p.source === "manual" ? "admin" : "YouTube"}</Pill>
                  {p.notified_at ? <span>notified {fmt(p.notified_at)}</span> : <Pill tone="amber">not sent</Pill>}
                  {Number(p.replies) > 0 && <span>{Number(p.replies)} volunteer replies</span>}
                  {p.hidden && <Pill tone="red">hidden</Pill>}
                </div>
              </div>
              <div className="flex gap-1">
                <form action={sendDailyNow}>
                  <input type="hidden" name="id" value={String(p.id)} />
                  <button className="rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-semibold hover:bg-neutral-50">{p.notified_at ? "Send again" : "Send now"}</button>
                </form>
                <form action={setDailyHidden}>
                  <input type="hidden" name="id" value={String(p.id)} />
                  <input type="hidden" name="hidden" value={p.hidden ? "0" : "1"} />
                  <button className="rounded-md px-2 py-1 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-100">{p.hidden ? "Show" : "Hide"}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
