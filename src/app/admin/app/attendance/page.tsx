import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { Card, Pill, btnLight, fmt, hours, input } from "../ui";

export default async function Attendance({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; user?: string }> }) {
  await appReady();
  const sp = await searchParams;
  const monthStart = new Date();
  monthStart.setDate(1);
  const from = sp.from || monthStart.toISOString().slice(0, 10);
  const to = sp.to || new Date().toISOString().slice(0, 10);
  const user = sp.user || "";
  const sql = db();
  const rows = await sql`
    select a.id, a.check_in_at, a.check_out_at, a.lat, a.lng, a.accuracy, a.biometric, a.device, a.note, (a.selfie_key is not null and a.check_in_at > now() - interval '15 days') as has_selfie, u.name, u.id as user_id,
           extract(epoch from (coalesce(a.check_out_at, now()) - a.check_in_at))::float as seconds
    from app_attendance a join app_users u on u.id = a.user_id
    where a.check_in_at >= ${from}::date and a.check_in_at < (${to}::date + interval '1 day')
      and (${user === ""} or u.id = ${Number(user) || 0})
    order by a.check_in_at desc limit 500`;
  const summary = await sql`
    select u.id, u.name, count(*)::int as sessions,
           sum(extract(epoch from (coalesce(a.check_out_at, now()) - a.check_in_at)))::float as seconds
    from app_attendance a join app_users u on u.id = a.user_id
    where a.check_in_at >= ${from}::date and a.check_in_at < (${to}::date + interval '1 day')
    group by u.id, u.name order by seconds desc`;
  const volunteers = await sql`select id, name from app_users where role in ('volunteer','admin') order by name`;
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] font-semibold text-neutral-600">
          From
          <input type="date" name="from" defaultValue={from} className={`${input} mt-1`} />
        </label>
        <label className="text-[11px] font-semibold text-neutral-600">
          To
          <input type="date" name="to" defaultValue={to} className={`${input} mt-1`} />
        </label>
        <label className="text-[11px] font-semibold text-neutral-600">
          Volunteer
          <select name="user" defaultValue={user} className={`${input} mt-1 w-auto`}>
            <option value="">Everyone</option>
            {volunteers.map((v) => (
              <option key={String(v.id)} value={String(v.id)}>
                {(v.name as string) || `#${v.id}`}
              </option>
            ))}
          </select>
        </label>
        <button className={btnLight}>Show</button>
      </form>

      <Card title="Hours per volunteer">
        {summary.length === 0 && <p className="text-[13px] text-neutral-500">No check-ins in this period.</p>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {summary.map((s) => (
            <div key={String(s.id)} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-[12.5px]">
              <div>
                <div className="font-semibold">{(s.name as string) || `#${s.id}`}</div>
                <div className="text-[11px] text-neutral-500">{Number(s.sessions)} check-ins</div>
              </div>
              <div className="font-bold">{hours(Number(s.seconds) * 1000)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title={`${rows.length} check-ins`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-2 pr-3">Selfie</th>
                <th className="py-2 pr-3">Volunteer</th>
                <th className="py-2 pr-3">In</th>
                <th className="py-2 pr-3">Out</th>
                <th className="py-2 pr-3">Hours</th>
                <th className="py-2 pr-3">Face ID</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((a) => (
                  <tr key={String(a.id)}>
                    <td className="py-2 pr-3">
                      {a.has_selfie ? (
                        <a href={`/admin/app/attendance/${a.id}/selfie`} target="_blank">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/admin/app/attendance/${a.id}/selfie`} alt="" className="h-10 w-10 rounded-full object-cover" />
                        </a>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-neutral-100" />
                      )}
                    </td>
                    <td className="py-2 pr-3 font-medium">{(a.name as string) || `#${a.user_id}`}</td>
                    <td className="py-2 pr-3">{fmt(a.check_in_at)}</td>
                    <td className="py-2 pr-3">{a.check_out_at ? fmt(a.check_out_at) : <Pill tone="green">checked in</Pill>}</td>
                    <td className="py-2 pr-3 font-semibold">{hours(Number(a.seconds) * 1000)}</td>
                    <td className="py-2 pr-3">{a.biometric ? <Pill tone="green">verified</Pill> : <Pill tone="amber">no</Pill>}</td>
                    <td className="py-2 pr-3">
                      {a.lat != null ? (
                        <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">
                          map{a.accuracy != null ? ` (±${Math.round(Number(a.accuracy))} m)` : ""}
                        </a>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="py-2 text-neutral-500">{a.device as string}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
