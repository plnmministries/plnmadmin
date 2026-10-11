import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { sendCustomNotification } from "../actions";
import { Card, btnDark, fmt, input } from "../ui";

export default async function Notify() {
  await appReady();
  const sql = db();
  const [devices, history] = await Promise.all([
    sql`select count(*)::int as all_devices, count(*) filter (where u.role in ('volunteer','admin'))::int as volunteer_devices from app_push_tokens t join app_users u on u.id = t.user_id where not u.blocked`,
    sql`select * from app_notifications order by sent_at desc limit 50`,
  ]);
  const d = devices[0];
  return (
    <div className="space-y-4">
      <Card title="Send a notification">
        <p className="mb-3 text-[11.5px] text-neutral-500">
          Reaches {Number(d.all_devices)} devices (everyone) or {Number(d.volunteer_devices)} (volunteers). Keep it short; the app opens to the home screen when tapped.
        </p>
        <form action={sendCustomNotification} className="max-w-xl space-y-2">
          <input name="title" required maxLength={100} placeholder="Title" className={input} />
          <textarea name="body" rows={3} maxLength={300} placeholder="Message" className={input} />
          <select name="audience" className={`${input} w-auto`}>
            <option value="all">Everyone</option>
            <option value="volunteers">Volunteers only</option>
          </select>
          <div>
            <button className={btnDark}>Send now</button>
          </div>
        </form>
      </Card>
      <Card title="History">
        <ul className="divide-y divide-neutral-100 text-[12.5px]">
          {history.map((h) => (
            <li key={String(h.id)} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{h.title as string}</div>
                <div className="truncate text-[11px] text-neutral-500">
                  {h.kind as string} · {h.audience as string} · {fmt(h.sent_at)}
                  {h.body ? ` · ${h.body as string}` : ""}
                </div>
              </div>
              <span className="shrink-0 text-[11px] text-neutral-500">{Number(h.sent_count)} devices</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
