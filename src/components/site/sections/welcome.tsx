"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EditHotspot, Txt, useLang, useSite } from "../context";
import { Btn, Img } from "./common";

type Slide = {
  title: string;
  subtitle: string;
  background: "gradient" | "photo" | "youtube";
  image?: string;
  youtubeId?: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
};

type P = { p: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any

function SlideBackground({ s, active }: { s: Slide; active: boolean }) {
  return (
    <div className="absolute inset-0">
      {/* brand gradient is always underneath, so photos fade in over colour, never black */}
      <div className="welcome-gradient absolute inset-0" />
      <div className="beams opacity-70" />
      <div className="sparkle" />
      {s.background === "photo" && s.image && (
        <div className="absolute inset-0 overflow-hidden">
          <Img src={s.image} className={`h-full w-full object-cover ${active ? "kenburns" : ""}`} />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgb(var(--primary-rgb)/0.45),rgb(var(--glow-rgb)/0.35)_55%,transparent)] mix-blend-multiply" />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}
      {s.background === "youtube" && s.youtubeId && active && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${s.youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${s.youtubeId}&playsinline=1&modestbranding=1&rel=0`}
            allow="autoplay; encrypted-media"
            title="Background video"
            className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      )}
      {/* Elevation-style fade so the welcome text always reads */}
      <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--bg-rgb))] via-[rgb(var(--bg-rgb)/0.35)] to-[rgb(var(--bg-rgb)/0.25)]" />
    </div>
  );
}

export function WelcomeSlider({ p }: P) {
  const { content, editing } = useSite();
  const { tr } = useLang();
  const slides: Slide[] = p.slides?.length ? p.slides : [];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const n = slides.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);
  const cur = Math.min(i, Math.max(0, n - 1));

  useEffect(() => {
    if (!p.autoplay || paused || editing || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(cur + 1), Math.max(3, p.interval || 7) * 1000);
    return () => clearTimeout(t);
  }, [cur, paused, editing, n, p.autoplay, p.interval, go]);

  if (!n) return null;
  const st = content.settings;
  const h = p.height === "full" ? "min-h-[100svh]" : p.height === "medium" ? "min-h-[64svh] md:min-h-[70vh]" : "min-h-[86svh] md:min-h-[88vh]";

  return (
    <section
      className={`group/edit relative isolate flex ${h} flex-col overflow-hidden`}
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        if (!touch.current || editing) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(cur + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
    >
      {slides.map((s, k) => (
        <div key={k} className={`absolute inset-0 -z-10 transition-opacity duration-1000 ${k === cur ? "opacity-100" : "opacity-0"}`} aria-hidden={k !== cur}>
          <SlideBackground s={s} active={k === cur} />
        </div>
      ))}
      <EditHotspot field={`slides.${cur}.image`} label="Change slide background" />

      <div className="wrap relative mt-auto pb-[max(2.25rem,env(safe-area-inset-bottom))] pt-36 md:pb-14">
        {slides.map((s, k) =>
          k !== cur ? null : (
            <div key={k} className="welcome-in flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between lg:gap-12" aria-live="polite">
              <div className="min-w-0 max-w-3xl">
                <Txt as="h1" className="h-display text-[clamp(1.45rem,6.9vw,3.6rem)] leading-[1.08] drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]" value={s.title} field={`slides.${k}.title`} />
                <Txt as="p" className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fg/85 sm:text-base md:text-xl" value={s.subtitle} field={`slides.${k}.subtitle`} multiline />
              </div>
              <div className="grid grid-cols-2 gap-3 max-[339px]:grid-cols-1 sm:flex sm:flex-wrap lg:shrink-0 lg:flex-nowrap [&_.btn]:!px-4 [&_.btn]:text-[0.74rem] sm:[&_.btn]:!px-6 sm:[&_.btn]:text-[0.82rem]">
                <Btn link={s.primary} field={`slides.${k}.primary`} variant="light" />
                <Btn link={s.secondary} field={`slides.${k}.secondary`} variant="ghost" />
              </div>
            </div>
          ),
        )}

        {p.showServiceTimes && (
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-fg/15 pt-5 text-sm text-fg/80 md:mt-10">
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">{tr("g:settings.serviceDay", st.serviceDay)}</span>
            {st.serviceTimes.map((t, k) => (
              <span key={k} className="whitespace-nowrap">
                <span className="text-fg/55">{tr(`g:settings.serviceTimes.${k}.label`, t.label)} · </span>
                <span className="font-semibold text-fg">{t.time}</span>
              </span>
            ))}
          </div>
        )}

        {n > 1 && (
          <div className="mt-6 flex items-center justify-between gap-4 md:mt-8">
            <div className="-ml-1 flex items-center" role="tablist">
              {slides.map((_, k) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={k === cur}
                  aria-label={`Slide ${k + 1}`}
                  onClick={() => go(k)}
                  className="group/dot grid h-10 min-w-10 place-items-center px-1"
                >
                  <span className={`block h-1.5 rounded-full transition-all duration-500 ${k === cur ? "w-9 bg-[var(--accent)]" : "w-3 bg-fg/35 group-hover/dot:bg-fg/60"}`} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => go(cur - 1)} aria-label="Previous slide" className="grid h-11 w-11 place-items-center rounded-full border border-fg/20 bg-[rgb(var(--bg-rgb)/0.3)] backdrop-blur transition hover:border-[var(--accent)]">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => go(cur + 1)} aria-label="Next slide" className="grid h-11 w-11 place-items-center rounded-full border border-fg/20 bg-[rgb(var(--bg-rgb)/0.3)] backdrop-blur transition hover:border-[var(--accent)]">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
