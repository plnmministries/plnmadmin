import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { publishVerse } from "../actions";
import { Card, btn, fmt, input } from "../ui";

// The Word for today on everyone's app Home. Paste it from any Bible app (Telugu, Hindi or English).
export default async function WordForToday({ searchParams }: { searchParams: Promise<{ published?: string; error?: string }> }) {
  await appReady();
  const { published, error } = await searchParams;
  const recent = await db()`select text, reference, created_at from app_verses order by id desc limit 10`;
  const current = recent[0];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Publish a new verse">
        {published && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-800">Published. It is on everyone&apos;s Home now.</p>}
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">{error}</p>}
        <form action={publishVerse} className="space-y-2">
          <label className="block text-[12.5px] font-semibold text-neutral-700">Verse</label>
          <textarea name="text" required rows={5} placeholder="Paste the verse here (Telugu, Hindi or English)" className={input} />
          <label className="block text-[12.5px] font-semibold text-neutral-700">Reference</label>
          <input name="reference" placeholder="e.g. యిర్మీయా 29:11" className={input} />
          <button className={`${btn} bg-red-700 text-white hover:bg-red-800`}>Publish to everyone</button>
        </form>
        <p className="mt-3 text-[11.5px] text-neutral-500">It stays until you publish the next one. Until a verse is published, the app shows its own daily verse.</p>
      </Card>
      <Card title="Showing now">
        {current ? (
          <div className="rounded-xl bg-red-700 p-4 text-white">
            <p className="text-[15px] leading-relaxed">“{current.text as string}”</p>
            {!!current.reference && <p className="mt-2 text-[13px] font-semibold opacity-90">{current.reference as string}</p>}
          </div>
        ) : (
          <p className="text-[13px] text-neutral-500">Nothing published yet: the app shows its automatic daily verse.</p>
        )}
        {recent.length > 1 && (
          <div className="mt-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Earlier</div>
            {recent.slice(1).map((v, i) => (
              <div key={i} className="text-[12.5px] text-neutral-600">
                “{(v.text as string).slice(0, 120)}” <span className="text-neutral-400">· {v.reference as string} · {fmt(v.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
