"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { X, Share2, Check, Play, ExternalLink } from "lucide-react";
import type { Sermon } from "@/lib/types";
import { formatDate, sortedSermons, ytThumb } from "@/lib/util";
import { useLang, useSite } from "./context";

type Playable = { id: string; title: string; date?: string; speaker?: string; category?: string; live?: boolean };

const VideoCtx = createContext<{ play: (v: Playable) => void }>({ play: () => {} });
export const useVideo = () => useContext(VideoCtx);

export function embedUrl(id: string, autoplay = true) {
  return `https://www.youtube-nocookie.com/embed/${id}?${autoplay ? "autoplay=1&" : ""}rel=0&modestbranding=1&playsinline=1`;
}

export function VideoProvider({ children }: { children: ReactNode }) {
  const { content, editing, query } = useSite();
  // Deep link: /sermons?watch=VIDEO_ID opens the player on load.
  const [current, setCurrent] = useState<Playable | null>(() => {
    if (!query.watch || editing) return null;
    const s = content.sermons.find((x) => x.id === query.watch);
    return s ? { ...s } : { id: query.watch, title: "" };
  });
  const [copied, setCopied] = useState(false);
  const { ui, tr, locale } = useLang();

  const play = useCallback(
    (v: Playable) => {
      setCurrent(v);
      if (!editing && !v.live) {
        const url = new URL(window.location.href);
        url.searchParams.set("watch", v.id);
        window.history.replaceState(null, "", url);
      }
    },
    [editing],
  );

  const close = useCallback(() => {
    setCurrent(null);
    if (!editing) {
      const url = new URL(window.location.href);
      url.searchParams.delete("watch");
      window.history.replaceState(null, "", url);
    }
  }, [editing]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [current, close]);

  const upNext = useMemo(() => {
    if (!current) return [];
    const all = sortedSermons(content);
    const same = all.filter((s) => s.id !== current.id && s.category === current.category);
    return (same.length ? same : all.filter((s) => s.id !== current.id)).slice(0, 8);
  }, [current, content]);

  const catName = (id?: string) => {
    const c = content.sermonCategories.find((x) => x.id === id);
    return c && tr(`c:${c.id}:name`, c.name);
  };

  return (
    <VideoCtx.Provider value={{ play }}>
      {children}
      {current && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/90 backdrop-blur-md md:items-center" onClick={close}>
          <div className="relative w-full max-w-6xl px-3 pb-6 pt-16 md:p-8" onClick={(e) => e.stopPropagation()}>
            <button onClick={close} aria-label={ui("close")} className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 md:-right-2 md:-top-2">
              <X className="h-5 w-5" />
            </button>
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <div>
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl">
                  <iframe
                    key={current.id}
                    src={embedUrl(current.id)}
                    title={current.title || "Video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
                <div className="mt-4 text-white">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
                    {current.live && (
                      <span className="flex items-center gap-2 rounded-full bg-red-600 px-2.5 py-1 font-bold text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" /> {ui("live")}
                      </span>
                    )}
                    {catName(current.category) && <span style={{ color: "var(--accent)" }}>{catName(current.category)}</span>}
                    {current.date && <span>{formatDate(current.date, undefined, locale)}</span>}
                    {current.speaker && <span>· {current.speaker}</span>}
                  </div>
                  {current.title && <h2 className="mt-2 text-xl font-semibold leading-snug md:text-2xl">{current.title}</h2>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                      onClick={() => {
                        const url = `${window.location.origin}/sermons?watch=${current.id}`;
                        if (navigator.share) navigator.share({ title: current.title, url }).catch(() => {});
                        else navigator.clipboard.writeText(url).then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1800);
                        });
                      }}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {copied ? ui("copied") : ui("share")}
                    </button>
                    <a href={`https://www.youtube.com/watch?v=${current.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
                      <ExternalLink className="h-4 w-4" /> YouTube
                    </a>
                  </div>
                </div>
              </div>
              {upNext.length > 0 && (
                <div className="text-white">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/50">{ui("upNext")}</div>
                  <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1 no-scrollbar">
                    {upNext.map((s) => (
                      <button key={s.id} onClick={() => play(s)} className="group flex gap-3 text-left">
                        <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-white/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ytThumb(s.id, "mq")} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                          <Play className="absolute inset-0 m-auto h-6 w-6 fill-white text-white opacity-0 transition group-hover:opacity-100" />
                        </div>
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-sm font-medium leading-snug">{s.title}</div>
                          <div className="mt-1 text-xs text-white/50">{formatDate(s.date, undefined, locale)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </VideoCtx.Provider>
  );
}

export function useLive() {
  const [live, setLive] = useState<{ live: boolean; videoId: string | null }>({ live: false, videoId: null });
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/live")
        .then((r) => r.json())
        .then((d) => alive && setLive(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 90_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return live;
}

export function SermonCard({ s, size = "md" }: { s: Sermon; size?: "md" | "lg" }) {
  const { play } = useVideo();
  const { content } = useSite();
  const { tr, locale } = useLang();
  const catObj = content.sermonCategories.find((c) => c.id === s.category);
  const cat = catObj && tr(`c:${catObj.id}:name`, catObj.name);
  return (
    <button onClick={() => play(s)} className="group block w-full text-left">
      <div className="relative aspect-video overflow-hidden rounded-theme bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ytThumb(s.id, size === "lg" ? "max" : "hq")} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-80" />
        <span className="absolute bottom-3 left-3 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-black shadow-lg transition group-hover:scale-110 group-hover:bg-[var(--accent)]">
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {cat && <span className="truncate text-accent">{cat}</span>}
          {s.date && <span className="shrink-0">{formatDate(s.date, undefined, locale)}</span>}
        </div>
        <div className={`mt-1 line-clamp-2 font-semibold leading-snug ${size === "lg" ? "text-lg" : "text-[15px]"} group-hover:text-accent transition-colors`}>{s.title}</div>
      </div>
    </button>
  );
}
