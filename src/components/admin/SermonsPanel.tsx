"use client";

import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, Loader2, Plus, RefreshCw, Search, Star, Trash2, X } from "lucide-react";
import type { Sermon, SiteContent } from "@/lib/types";
import { formatDate, uid, ytThumb } from "@/lib/util";
import { useApi } from "./api";
import { Label, Section, Text, inputCls } from "./fields";
import { PanelHeader } from "./panels";

type Found = { id: string; title: string; date: string; category: string; speaker: string; published?: string };

function CategorySelect({ value, onChange, content, className = "" }: { value: string; onChange: (v: string) => void; content: SiteContent; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} ${className}`}>
      {content.sermonCategories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export function SermonsPanel() {
  const { content, ed, toast } = useApi();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [link, setLink] = useState("");
  const [pending, setPending] = useState<Found | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [found, setFound] = useState<(Found & { pick: boolean })[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(40);

  const all = useMemo(() => [...content.sermons].sort((a, b) => (b.date || "0").localeCompare(a.date || "0")), [content.sermons]);
  const list = all.filter((s) => (cat === "all" || s.category === cat) && (!q || s.title.toLowerCase().includes(q.toLowerCase())));
  const ids = new Set(content.sermons.map((s) => s.id));

  const upd = (id: string, patch: Partial<Sermon>) =>
    ed.commit((c) => ({ ...c, sermons: c.sermons.map((s) => (s.id === id ? { ...s, ...patch } : s)) }), `sermon.${id}.${Object.keys(patch)[0]}`);

  const feature = (id: string) => ed.commit((c) => ({ ...c, sermons: c.sermons.map((s) => ({ ...s, featured: s.id === id ? !s.featured : false })) }));

  const lookup = async () => {
    if (!link.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/admin/youtube?lookup=${encodeURIComponent(link.trim())}`);
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return toast(d.error, "err");
    if (ids.has(d.id)) return toast("That video is already in the library");
    setPending(d);
  };

  const add = (items: Found[]) => {
    const fresh = items.filter((f) => !ids.has(f.id));
    ed.commit((c) => ({ ...c, sermons: [...fresh.map((f) => ({ id: f.id, title: f.title, date: f.date, category: f.category, speaker: f.speaker })), ...c.sermons] }));
    toast(`${fresh.length} video${fresh.length === 1 ? "" : "s"} added`);
  };

  const sync = async () => {
    setSyncing(true);
    const r = await fetch("/api/admin/youtube?latest=1");
    const d = await r.json();
    setSyncing(false);
    if (!r.ok) return toast(d.error, "err");
    const fresh = (d.items as Found[]).filter((f) => !ids.has(f.id));
    if (!fresh.length) return toast("You're up to date — no new videos on the channel");
    // pre-tick everything except shorts/daily clips older than the newest in the library
    setFound(fresh.map((f) => ({ ...f, pick: true })));
  };

  return (
    <div>
      <PanelHeader title="Sermons & videos" sub={`${content.sermons.length} videos · play inside the site, organised by category`} />

      <div className="space-y-3 border-b border-neutral-200 p-4">
        <button onClick={sync} disabled={syncing} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync new videos from YouTube
        </button>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="…or paste any YouTube link" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookup()} />
          <button onClick={lookup} disabled={busy || !link} className="shrink-0 rounded-lg bg-neutral-900 px-3 text-[12px] font-semibold text-white disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </button>
        </div>
        {pending && (
          <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
            <div className="flex gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ytThumb(pending.id, "mq")} alt="" className="h-12 w-20 rounded object-cover" />
              <input className={inputCls} value={pending.title} onChange={(e) => setPending({ ...pending, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <CategorySelect value={pending.category} onChange={(v) => setPending({ ...pending, category: v })} content={content} />
              <input type="date" className={inputCls} value={pending.date} onChange={(e) => setPending({ ...pending, date: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  add([pending]);
                  setPending(null);
                  setLink("");
                }}
                className="flex-1 rounded-lg bg-sky-600 py-2 text-[12px] font-semibold text-white"
              >
                Add to library
              </button>
              <button onClick={() => setPending(null)} className="rounded-lg border bg-white px-3 text-[12px]">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="sticky top-0 z-10 space-y-2 border-b border-neutral-200 bg-white p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input className={`${inputCls} pl-8`} placeholder="Search library…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
          <option value="all">All categories ({content.sermons.length})</option>
          {content.sermonCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({content.sermons.filter((s) => s.category === c.id).length})
            </option>
          ))}
        </select>
      </div>

      <div className="p-2">
        {list.slice(0, shown).map((s) => (
          <div key={s.id} className={`mb-1 rounded-lg ${open === s.id ? "bg-neutral-50 ring-1 ring-neutral-200" : "hover:bg-neutral-50"}`}>
            <div className="flex items-center gap-2 p-1.5">
              <button onClick={() => setOpen(open === s.id ? null : s.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ytThumb(s.id, "mq")} alt="" className={`h-10 w-[70px] shrink-0 rounded object-cover ${s.hidden ? "opacity-40" : ""}`} loading="lazy" />
                <div className="min-w-0">
                  <div className={`line-clamp-2 text-[12px] font-medium leading-snug ${s.hidden ? "text-neutral-400" : ""}`}>{s.title}</div>
                  <div className="text-[10.5px] text-neutral-500">
                    {content.sermonCategories.find((c) => c.id === s.category)?.name} {s.date && `· ${formatDate(s.date)}`}
                  </div>
                </div>
              </button>
              <button title={s.featured ? "Featured on home" : "Feature on home page"} onClick={() => feature(s.id)} className={`rounded p-1 ${s.featured ? "text-amber-500" : "text-neutral-300 hover:text-amber-500"}`}>
                <Star className={`h-4 w-4 ${s.featured ? "fill-current" : ""}`} />
              </button>
            </div>
            {open === s.id && (
              <div className="space-y-2 px-2.5 pb-3">
                <div>
                  <Label>Title</Label>
                  <Text value={s.title} onChange={(v) => upd(s.id, { title: v })} multiline rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Category</Label>
                    <CategorySelect value={s.category} onChange={(v) => upd(s.id, { category: v })} content={content} />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <input type="date" className={inputCls} value={s.date} onChange={(e) => upd(s.id, { date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Speaker</Label>
                  <select className={inputCls} value={s.speaker} onChange={(e) => upd(s.id, { speaker: e.target.value })}>
                    {content.speakers.map((sp) => (
                      <option key={sp}>{sp}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => upd(s.id, { hidden: !s.hidden })} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border bg-white py-1.5 text-[12px] font-semibold">
                    {s.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {s.hidden ? "Show" : "Hide"}
                  </button>
                  <a href={`https://youtu.be/${s.id}`} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center rounded-lg border bg-white py-1.5 text-[12px] font-semibold">
                    Open on YouTube
                  </a>
                  <button onClick={() => ed.commit((c) => ({ ...c, sermons: c.sermons.filter((x) => x.id !== s.id) }))} className="rounded-lg border border-red-200 bg-white px-2.5 text-red-600" title="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {list.length > shown && (
          <button onClick={() => setShown((n) => n + 40)} className="w-full py-3 text-[12px] font-semibold text-sky-700">
            Show more ({list.length - shown})
          </button>
        )}
      </div>

      <Section title="Categories" defaultOpen={false}>
        <CategoriesEditor />
      </Section>
      <Section title="Speakers" defaultOpen={false}>
        <SpeakersEditor />
      </Section>

      {found && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/40 p-6" onClick={() => setFound(null)}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="font-semibold">{found.length} new videos on YouTube</div>
                <div className="text-[12px] text-neutral-500">Categories are guessed from the titles — adjust before importing.</div>
              </div>
              <button onClick={() => setFound(null)} className="rounded-md p-1 hover:bg-neutral-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 border-b bg-neutral-50 px-5 py-2 text-[12px]">
              <button onClick={() => setFound(found.map((f) => ({ ...f, pick: true })))} className="font-semibold text-sky-700">
                Select all
              </button>
              <button onClick={() => setFound(found.map((f) => ({ ...f, pick: false })))} className="font-semibold text-sky-700">
                None
              </button>
              <button onClick={() => setFound(found.map((f) => ({ ...f, pick: f.category !== "daily-word" })))} className="font-semibold text-sky-700">
                Skip daily clips
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {found.map((f, i) => (
                <div key={f.id} className={`mb-1 flex items-center gap-3 rounded-lg p-2 ${f.pick ? "bg-sky-50" : ""}`}>
                  <button
                    onClick={() => setFound(found.map((x, j) => (j === i ? { ...x, pick: !x.pick } : x)))}
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${f.pick ? "border-sky-600 bg-sky-600 text-white" : "border-neutral-300 bg-white"}`}
                  >
                    {f.pick && <Check className="h-3.5 w-3.5" />}
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ytThumb(f.id, "mq")} alt="" className="h-11 w-20 shrink-0 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[12.5px] font-medium leading-snug">{f.title}</div>
                    <div className="text-[11px] text-neutral-500">{f.date ? formatDate(f.date) : f.published}</div>
                  </div>
                  <CategorySelect value={f.category} onChange={(v) => setFound(found.map((x, j) => (j === i ? { ...x, category: v } : x)))} content={content} className="!w-40 shrink-0" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <button onClick={() => setFound(null)} className="rounded-lg border px-4 py-2 text-[13px]">
                Cancel
              </button>
              <button
                onClick={() => {
                  add(found.filter((f) => f.pick));
                  setFound(null);
                }}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white"
              >
                Import {found.filter((f) => f.pick).length} videos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoriesEditor() {
  const { content, ed } = useApi();
  const [name, setName] = useState("");
  return (
    <div className="space-y-2">
      {content.sermonCategories.map((c, i) => (
        <div key={c.id} className="flex items-center gap-2">
          <input className={inputCls} value={c.name} onChange={(e) => ed.commit((x) => ({ ...x, sermonCategories: x.sermonCategories.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)) }), `cat.${c.id}`)} />
          <span className="w-8 shrink-0 text-right text-[11px] text-neutral-400">{content.sermons.filter((s) => s.category === c.id).length}</span>
          <button
            onClick={() => {
              if (content.sermons.some((s) => s.category === c.id)) return alert("Move the videos in this category to another category first.");
              ed.commit((x) => ({ ...x, sermonCategories: x.sermonCategories.filter((y) => y.id !== c.id) }));
            }}
            className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input className={inputCls} placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} />
        <button
          onClick={() => {
            if (!name.trim()) return;
            ed.commit((x) => ({ ...x, sermonCategories: [...x.sermonCategories, { id: uid("c"), name: name.trim() }] }));
            setName("");
          }}
          className="shrink-0 rounded-lg bg-neutral-900 px-3 text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[11px] text-neutral-500">Categories appear in this order as rows on the Sermons page. Empty categories are hidden.</p>
    </div>
  );
}

function SpeakersEditor() {
  const { content, ed } = useApi();
  const [name, setName] = useState("");
  return (
    <div className="space-y-2">
      {content.speakers.map((sp, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={inputCls} value={sp} onChange={(e) => ed.commit((x) => ({ ...x, speakers: x.speakers.map((y, j) => (j === i ? e.target.value : y)) }), `sp.${i}`)} />
          <button onClick={() => ed.commit((x) => ({ ...x, speakers: x.speakers.filter((_, j) => j !== i) }))} className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input className={inputCls} placeholder="Add speaker" value={name} onChange={(e) => setName(e.target.value)} />
        <button
          onClick={() => {
            if (!name.trim()) return;
            ed.commit((x) => ({ ...x, speakers: [...x.speakers, name.trim()] }));
            setName("");
          }}
          className="shrink-0 rounded-lg bg-neutral-900 px-3 text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

