import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { decideVolunteerRequest } from "../actions";
import { Card, Pill, btn, btnLight, fmt } from "../ui";

// Members who asked (in the app) to join the volunteer team. Approving makes them a volunteer and notifies them.
export default async function VolunteerRequests() {
  await appReady();
  const rows = await db()`
    select v.id, v.note, v.status, v.created_at, v.decided_at, u.name, u.phone, u.email
    from app_volunteer_requests v join app_users u on u.id = v.user_id
    order by (v.status = 'pending') desc, v.created_at desc limit 200`;
  const pending = rows.filter((r) => r.status === "pending").length;
  return (
    <Card title={`${pending} waiting · ${rows.length} total`}>
      {rows.length === 0 ? (
        <p className="text-[13px] text-neutral-500">No one has asked to volunteer yet. Members see “Become a volunteer” on the app&apos;s Home and under More.</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {rows.map((r) => (
            <div key={String(r.id)} className="flex flex-wrap items-start gap-3 py-3">
              <div className="min-w-[220px] flex-1">
                <div className="text-[14px] font-semibold">
                  {r.name as string}{" "}
                  <Pill tone={r.status === "pending" ? "amber" : r.status === "approved" ? "green" : "red"}>{r.status as string}</Pill>
                </div>
                <div className="text-[12.5px] text-neutral-500">
                  {[r.phone, r.email].filter(Boolean).join(" · ")} · asked {fmt(r.created_at)}
                </div>
                {!!r.note && <p className="mt-1 text-[13px] text-neutral-700">“{r.note as string}”</p>}
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <form action={decideVolunteerRequest}>
                    <input type="hidden" name="id" value={String(r.id)} />
                    <input type="hidden" name="decision" value="approve" />
                    <button className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>Approve</button>
                  </form>
                  <form action={decideVolunteerRequest}>
                    <input type="hidden" name="id" value={String(r.id)} />
                    <input type="hidden" name="decision" value="decline" />
                    <button className={btnLight}>Decline</button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
