"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Play, Radio, Search, X } from "lucide-react";
import { formatDate, nextService, sortedSermons, ytThumb } from "@/lib/util";
import type { Sermon } from "@/lib/types";
import { ManageChip, Txt, useLang, useSite } from "../context";
import { embedUrl, SermonCard, useLive, useVideo } from "../video";
import { SectionHead, SmartLink } from "./common";
import { YouTubeIcon } from "../icons";

type P = { p: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any

export function LatestSermon({ p }: P) {
  const { content, editing } = useSite();
  const list = sortedSermons(content);
  const s: Sermon | undefined =
    (p.mode === "pick" && content.sermons.find((x) => x.id === p.videoId)) || list.find((x) => x.featured) || list[0];
  const [playing, setPlaying] = useState(false);
  const { ui, tr, locale } = useLang();
  if (!s) return null;
  const catObj = content.sermonCategories.find((c) => c.id === s.category);
  const cat = catObj && tr(`c:${catObj.id}:name`, catObj.name);
  return (
    <section className="section-pad relative">
      <ManageChip panel="sermons" label="Manage sermons" />
      <div className="wrap grid items-center gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="reveal relative">
          <div className="absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(closest-side,rgb(var(--glow-rgb)/0.35),transparent)] blur-2xl" />
          <div className="relative aspect-video overflow-hidden rounded-theme bg-black shadow-2xl">
            {playing && !editing ? (
              <iframe src={embedUrl(s.id)} title={s.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="h-full w-full" />
            ) : (
              <button onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ytThumb(s.id, "max")} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute inset-0 bg-black/30 transition group-hover:bg-black/10" />
                <span className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-black shadow-2xl transition group-hover:scale-110">
                  <Play className="ml-1 h-8 w-8 fill-current" />
                </span>
              </button>
            )}
          </div>
        </div>
        <div>
          <Txt as="div" className="eyebrow mb-4" value={p.eyebrow} field="eyebrow" />
          <Txt as="h2" className="h-display text-3xl md:text-4xl" value={p.title} field="title" />
          <div className="mt-6 text-xl font-semibold leading-snug">{s.title}</div>
          <div className="mt-3 text-sm text-muted">
            {[cat, formatDate(s.date, { day: "numeric", month: "long", year: "numeric" }, locale), s.speaker].filter(Boolean).join(" · ")}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => setPlaying(true)} className="btn btn-primary">
              <Play className="h-4 w-4 fill-current" /> {ui("watchNow")}
            </button>
            <SmartLink href="/sermons" className="btn btn-ghost">
              <Txt value={p.ctaLabel} field="ctaLabel" /> <ArrowRight className="h-4 w-4" />
            </SmartLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function useCountdown(target: number | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0); // client-only, avoids hydration mismatch
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  if (!target || now == null) return null;
  const diff = Math.max(0, target - now);
  return {
    started: diff === 0,
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

function LiveBlock({ p }: P) {
  const { content, editing } = useSite();
  const live = useLive();
  const { play } = useVideo();
  const { ui, tr } = useLang();
  const next = useMemo(() => nextService(content.settings.serviceTimes), [content.settings.serviceTimes]);
  const cd = useCountdown(next?.at);
  const latestService = sortedSermons(content).find((s) => ["prophetic-sunday", "holy-communion", "sunday-service", "special-services"].includes(s.category));

  return (
    <div id="live" className="scroll-mt-28">
      <div className="relative overflow-hidden rounded-[calc(var(--radius)*1.4)] border border-fg/10 bg-surface">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_0%_0%,rgb(var(--primary-rgb)/0.25),transparent_60%),radial-gradient(60%_100%_at_100%_100%,rgb(var(--glow-rgb)/0.25),transparent_60%)]" />
        <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="aspect-video overflow-hidden rounded-theme bg-black">
            {live.live && live.videoId && !editing ? (
              <iframe src={embedUrl(live.videoId, false)} title="Live" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="h-full w-full" />
            ) : latestService ? (
              <button onClick={() => play(latestService)} className="group relative h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ytThumb(latestService.id, "max")} alt="" className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100" />
                <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-black shadow-xl transition group-hover:scale-110">
                  <Play className="ml-1 h-6 w-6 fill-current" />
                </span>
                <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">{ui("replay")}</span>
              </button>
            ) : null}
          </div>
          <div>
            {live.live ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">
                <span className="live-dot !bg-white" /> {ui("liveNow")}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-fg/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-muted">
                <Radio className="h-3.5 w-3.5" /> {ui("notLive")}
              </div>
            )}
            <Txt as="h2" className="h-display mt-5 text-3xl md:text-4xl" value={p.liveTitle} field="liveTitle" />
            <Txt as="p" className="mt-3 text-muted" value={p.liveText} field="liveText" multiline />
            {!live.live && next && cd && (
              <div className="mt-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">{ui("nextLive")}</div>
                <div className="mt-1 text-sm text-muted">
                  {tr(`g:settings.serviceTimes.${content.settings.serviceTimes.findIndex((t) => t.label === next.label)}.label`, next.label)} · {ui("sunday")} {next.time} {ui("ist")}
                </div>
                <div className="mt-3 flex gap-3">
                  {[
                    [ui("days"), cd.d],
                    [ui("hrs"), cd.h],
                    [ui("min"), cd.m],
                    [ui("sec"), cd.s],
                  ].map(([l, v]) => (
                    <div key={l as string} className="w-16 rounded-xl border border-fg/10 bg-[rgb(var(--bg-rgb)/0.6)] py-3 text-center">
                      <div className="font-display text-2xl font-bold tabular-nums text-accent">{String(v).padStart(2, "0")}</div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              {/* always works, even if live detection misses a stream: YouTube resolves the channel's current live */}
              <a
                href={live.live && live.videoId ? `https://www.youtube.com/watch?v=${live.videoId}` : `https://www.youtube.com/channel/${content.settings.youtubeChannelId}/live`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                <YouTubeIcon className="h-4 w-4" /> {ui("openYoutube")}
              </a>
              <a href={`${content.settings.socials.youtube}?sub_confirmation=1`} target="_blank" rel="noreferrer" className="btn btn-ghost">
                {ui("subscribe")}
              </a>
              {live.live && live.videoId && (
                <button className="btn btn-ghost" onClick={() => play({ id: live.videoId!, title: "Live service", live: true } as never)}>
                  {ui("theatre")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ title, items, onAll }: { title: string; items: Sermon[]; onAll: () => void }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const { ui } = useLang();
  const scroll = (dir: number) => el?.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  return (
    <div className="mt-14">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h3 className="h-display text-2xl md:text-3xl">{title}</h3>
        <div className="flex items-center gap-2">
          <button onClick={onAll} className="-my-2 mr-1 px-2 py-3 text-xs font-bold uppercase tracking-[0.2em] text-accent hover:underline">
            {ui("seeAll")}
          </button>
          <button onClick={() => scroll(-1)} aria-label="Scroll left" className="hidden h-9 w-9 place-items-center rounded-full border border-fg/15 hover:border-[var(--accent)] md:grid">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll(1)} aria-label="Scroll right" className="hidden h-9 w-9 place-items-center rounded-full border border-fg/15 hover:border-[var(--accent)] md:grid">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={setEl} className="no-scrollbar -mx-5 flex snap-x gap-5 overflow-x-auto px-5 md:-mx-10 md:px-10">
        {items.map((s) => (
          <div key={s.id} className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[31%] xl:w-[23.5%]">
            <SermonCard s={s} />
          </div>
        ))}
      </div>
    </div>
  );
}

const PAGE = 24;

export function SermonLibrary({ p }: P) {
  const { content, query, editing } = useSite();
  const { ui, tr } = useLang();
  const all = useMemo(() => sortedSermons(content), [content]);
  const cats = content.sermonCategories.filter((c) => all.some((s) => s.category === c.id));
  const [cat, setCat] = useState<string>(query.category || "all");
  const [q, setQ] = useState("");
  const [speaker, setSpeaker] = useState("all");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    if (editing) return;
    const url = new URL(window.location.href);
    if (cat === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", cat);
    window.history.replaceState(null, "", url);
  }, [cat, editing]);

  const filtered = all.filter(
    (s) =>
      (cat === "all" || s.category === cat) &&
      (speaker === "all" || s.speaker === speaker) &&
      (!q || s.title.toLowerCase().includes(q.toLowerCase())),
  );
  const browsing = cat === "all" && !q && speaker === "all";
  const pick = (c: string) => {
    setCat(c);
    setShown(PAGE);
    document.getElementById("library")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="section-pad relative">
      <ManageChip panel="sermons" label="Manage sermons & categories" />
      <div className="wrap">
        {p.showLive && <LiveBlock p={p} />}

        <div id="library" className="scroll-mt-24 pt-16 md:pt-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="h-display text-3xl md:text-5xl">{ui("library")}</h2>
            <div className="flex gap-3">
              <label className="relative flex-1 md:w-72 md:flex-none">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setShown(PAGE);
                  }}
                  placeholder={ui("search")}
                  className="w-full rounded-full border border-fg/15 bg-surface py-3 pl-11 pr-10 text-sm outline-none placeholder:text-muted focus:border-[var(--accent)]"
                />
                {q && (
                  <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label="Clear search">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>
              <select
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                className="rounded-full border border-fg/15 bg-surface px-4 text-sm outline-none focus:border-[var(--accent)]"
                aria-label="Speaker"
              >
                <option value="all">{ui("allSpeakers")}</option>
                {content.speakers.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {[{ id: "all", name: ui("all") }, ...cats.map((c) => ({ ...c, name: tr(`c:${c.id}:name`, c.name) }))].map((c) => {
              const count = c.id === "all" ? all.length : all.filter((s) => s.category === c.id).length;
              const active = cat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => pick(c.id)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${active ? "border-transparent bg-[var(--accent)] font-semibold text-[var(--on-accent)]" : "border-fg/15 text-fg/80 hover:border-fg/40"}`}
                >
                  {c.name} <span className={active ? "opacity-70" : "text-muted"}>{count}</span>
                </button>
              );
            })}
          </div>

          {browsing ? (
            cats.map((c) => (
              <Row key={c.id} title={tr(`c:${c.id}:name`, c.name)} items={all.filter((s) => s.category === c.id).slice(0, 12)} onAll={() => pick(c.id)} />
            ))
          ) : (
            <>
              {cat !== "all" && (
                <p className="mt-8 max-w-2xl text-muted">{tr(`c:${cat}:description`, content.sermonCategories.find((c) => c.id === cat)?.description)}</p>
              )}
              <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.slice(0, shown).map((s) => (
                  <SermonCard key={s.id} s={s} />
                ))}
              </div>
              {filtered.length === 0 && <div className="py-20 text-center text-muted">{ui("noResults")}</div>}
              {filtered.length > shown && (
                <div className="mt-12 text-center">
                  <button onClick={() => setShown((n) => n + PAGE)} className="btn btn-ghost">
                    {ui("loadMore")}
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mt-20 text-center">
            <a href={content.settings.socials.youtube} target="_blank" rel="noreferrer" className="btn btn-ghost">
              <YouTubeIcon className="h-4 w-4" /> {ui("moreOnYoutube")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function VideoGrid({ p }: P) {
  const { content } = useSite();
  const { ui } = useLang();
  const items = sortedSermons(content)
    .filter((s) => !p.category || s.category === p.category)
    .slice(0, p.limit || 4);
  return (
    <section className="section-pad relative">
      <ManageChip panel="sermons" label="Manage videos" />
      <div className="wrap">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <SectionHead p={p} />
          <SmartLink href={`/sermons?category=${p.category || ""}`} className="btn btn-ghost">
            {ui("viewAll")} <ArrowRight className="h-4 w-4" />
          </SmartLink>
        </div>
        <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((s) => (
            <div key={s.id} className="reveal">
              <SermonCard s={s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
