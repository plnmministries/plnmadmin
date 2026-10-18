import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { createPerson, setUserBlocked, setUserRole } from "../actions";
import { Card, Pill, btn, btnLight, fmt, input } from "../ui";

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; added?: string; error?: string }> }) {
  await appReady();
  const { q = "", role = "", added, error } = await searchParams;
  const like = `%${q.trim()}%`;
  const rows = await db()`
    select u.*, (select count(*)::int from app_push_tokens t where t.user_id = u.id) as devices
    from app_users u
    where (${q.trim() === ""} or u.name ilike ${like} or u.username ilike ${like} or u.email ilike ${like} or u.phone ilike ${like})
      and (${role === ""} or u.role = ${role})
    order by u.created_at desc limit 300`;
  return (
    <div className="space-y-4">
      <Card title="Add a person">
        <p className="mb-3 text-[11.5px] text-neutral-500">
          Creates an app account. They sign in to the app with this <b>mobile number</b> (or the email) and the password. Give the password to them in person and ask them to change it in the app.
        </p>
        {added && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-800">Account created: {added}</p>}
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">{error}</p>}
        <form action={createPerson} className="grid gap-2 md:grid-cols-5">
          <input name="name" required minLength={2} placeholder="Full name" className={input} />
          <input name="phone" required inputMode="tel" placeholder="Mobile number" className={input} />
          <input name="email" type="email" placeholder="Email (optional)" className={input} />
          <input name="password" type="text" required minLength={8} placeholder="Password (8+ characters)" autoComplete="off" className={input} />
          <div className="flex gap-2">
            <select name="role" defaultValue="volunteer" className={`${input} w-auto`}>
              <option value="member">Member</option>
              <option value="volunteer">Volunteer</option>
              <option value="admin">Admin</option>
            </select>
            <button className={`${btn} bg-neutral-900 text-white hover:bg-neutral-800`}>Create</button>
          </div>
        </form>
      </Card>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, username, email or phone" className={`${input} md:w-80`} />
        <select name="role" defaultValue={role} className={`${input} w-auto`}>
          <option value="">All roles</option>
          <option value="member">Members</option>
          <option value="volunteer">Volunteers</option>
          <option value="admin">Admins</option>
        </select>
        <button className={btnLight}>Filter</button>
      </form>
      <Card title={`${rows.length} people`}>
        <p className="mb-3 text-[11.5px] text-neutral-500">
          <b>Volunteer</b> unlocks the Volunteer tab in the app (replies on daily prayers, check-in with Face ID + location, prayer request inbox). <b>Admin</b> can do all that plus manage from the app later.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Joined</th>
                <th className="py-2 pr-3">Last seen</th>
                <th className="py-2 pr-3">Devices</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((u) => (
                <tr key={String(u.id)} className={u.blocked ? "opacity-50" : ""}>
                  <td className="py-2 pr-3 font-medium">
                    {(u.name as string) || <span className="italic text-neutral-400">no name yet</span>} {u.blocked && <Pill tone="red">blocked</Pill>}
                  </td>
                  <td className="py-2 pr-3 text-neutral-600">
                    {u.username && <div className="font-medium text-neutral-800">@{u.username as string}</div>}
                    {u.email as string}
                    {u.phone && <div>{u.phone as string}</div>}
                  </td>
                  <td className="py-2 pr-3">
                    <form action={setUserRole} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={String(u.id)} />
                      <select name="role" defaultValue={u.role as string} className="rounded-md border border-neutral-300 px-2 py-1 text-[12px]">
                        <option value="member">Member</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className="rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-semibold hover:bg-neutral-50">Save</button>
                    </form>
                  </td>
                  <td className="py-2 pr-3 text-neutral-500">{fmt(u.created_at, false)}</td>
                  <td className="py-2 pr-3 text-neutral-500">{fmt(u.last_seen_at)}</td>
                  <td className="py-2 pr-3 text-neutral-500">{Number(u.devices)}</td>
                  <td className="py-2">
                    <form action={setUserBlocked}>
                      <input type="hidden" name="id" value={String(u.id)} />
                      <input type="hidden" name="blocked" value={u.blocked ? "0" : "1"} />
                      <button className={`rounded-md px-2 py-1 text-[11px] font-semibold ${u.blocked ? "text-emerald-700 hover:bg-emerald-50" : "text-red-600 hover:bg-red-50"}`}>{u.blocked ? "Unblock" : "Block"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
