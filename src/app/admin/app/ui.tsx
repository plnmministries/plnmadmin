// Small shared building blocks for the Mobile app admin pages (server-safe).

export const input = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";
export const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold disabled:opacity-40";
export const btnDark = `${btn} bg-neutral-900 text-white hover:bg-neutral-700`;
export const btnLight = `${btn} border border-neutral-300 bg-white hover:bg-neutral-50`;

export function Card({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white">
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <h2 className="text-[13px] font-bold">{title}</h2>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-neutral-500">{hint}</div>}
    </div>
  );
}

export function Pill({ tone, children }: { tone: "green" | "amber" | "neutral" | "red" | "violet"; children: React.ReactNode }) {
  const c = { green: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-800", neutral: "bg-neutral-100 text-neutral-600", red: "bg-red-100 text-red-700", violet: "bg-violet-100 text-violet-700" }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${c}`}>{children}</span>;
}

export const fmt = (d: unknown, withTime = true) =>
  d ? new Date(d as string).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}) }) : "";

export const hours = (ms: number) => `${Math.floor(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`;
