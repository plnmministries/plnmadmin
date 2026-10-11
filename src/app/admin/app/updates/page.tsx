import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { createUpdate, deleteUpdate, sendUpdateNow } from "../actions";
import { Card, Pill, btnDark, fmt, input } from "../ui";
import { ImageField } from "./image-field";

export default async function Updates() {
  await appReady();
  const rows = await db()`select * from app_updates order by published_at desc, id desc limit 100`;
  return (
    <div className="space-y-4">
      <Card title="Post an update">
        <p className="mb-3 text-[11.5px] text-neutral-500">Posters, announcements, timing changes. Shows in the app’s Updates tab; tick “Notify” to send it as a notification to everyone.</p>
        <form action={createUpdate} className="grid gap-3 md:grid-cols-[1fr_280px]">
          <div className="space-y-2">
            <input name="title" required placeholder="Title" className={input} />
            <textarea name="body" rows={4} placeholder="Details (optional)" className={input} />
            <input name="link" placeholder="Link (optional), e.g. /events or https://…" className={input} />
            <label className="flex items-center gap-2 text-[12.5px]">
              <input type="checkbox" name="notify" value="1" defaultChecked className="accent-red-600" /> Notify everyone now
            </label>
            <button className={btnDark}>Post update</button>
          </div>
          <ImageField name="image" />
        </form>
      </Card>
      <Card title={`${rows.length} updates`}>
        <ul className="divide-y divide-neutral-100">
          {rows.map((u) => (
            <li key={String(u.id)} className="flex items-start gap-3 py-3">
              {u.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.image as string} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-lg bg-neutral-100" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">{u.title as string}</div>
                {u.body && <p className="mt-0.5 line-clamp-2 text-[12px] text-neutral-600">{u.body as string}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                  <span>{fmt(u.published_at)}</span>
                  {u.notified_at ? <span>notified {fmt(u.notified_at)}</span> : <Pill tone="amber">not sent</Pill>}
                </div>
              </div>
              <div className="flex gap-1">
                <form action={sendUpdateNow}>
                  <input type="hidden" name="id" value={String(u.id)} />
                  <button className="rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-semibold hover:bg-neutral-50">{u.notified_at ? "Send again" : "Send now"}</button>
                </form>
                <form action={deleteUpdate}>
                  <input type="hidden" name="id" value={String(u.id)} />
                  <button className="rounded-md px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
