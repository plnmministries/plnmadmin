"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { EditHotspot, Txt, useSite } from "../context";
import { Icon } from "../icons";
import { Btn, Img, SectionHead, SmartLink } from "./common";

type P = { p: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any

export function Hero({ p }: P) {
  const { content } = useSite();
  const s = content.settings;
  const h = p.height === "medium" ? "min-h-[70vh]" : p.height === "large" ? "min-h-[86vh]" : "min-h-[100svh]";
  return (
    <section className={`group/edit relative isolate flex ${h} items-center overflow-hidden grain`}>
      <div className="aurora -z-10" />
      {p.background !== "youtube" && p.image && (
        <div className="absolute inset-0 -z-10 overflow-hidden" style={{ opacity: (p.background === "image" ? 100 : p.imageOpacity ?? 35) / 100 }}>
          <Img src={p.image} className="kenburns h-full w-full object-cover" />
        </div>
      )}
      {p.background === "youtube" && p.youtubeId && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={{ opacity: (p.imageOpacity ?? 60) / 100 }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${p.youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${p.youtubeId}&playsinline=1&modestbranding=1&rel=0`}
            allow="autoplay; encrypted-media"
            className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
            title="Background video"
          />
        </div>
      )}
      <div className="beams -z-10" />
      <div className="sparkle -z-10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgb(var(--bg-rgb)/0.55)] via-[rgb(var(--bg-rgb)/0.25)] to-[rgb(var(--bg-rgb))]" />
      <EditHotspot field="image" label="Change background" />

      <div className="wrap relative pb-24 pt-36 text-center">
        <Txt as="div" className="eyebrow mb-6" value={p.eyebrow} field="eyebrow" />
        <Txt as="h1" className="h-display mx-auto max-w-5xl text-[2.6rem] leading-[1.02] sm:text-6xl md:text-7xl lg:text-[5.6rem]" value={p.title} field="title" />
        {p.verse && <Txt as="div" className="gold-text mt-5 font-display text-sm tracking-[0.4em] md:text-base" value={p.verse} field="verse" />}
        <Txt as="p" className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-fg/80 md:text-xl" value={p.subtitle} field="subtitle" multiline />
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Btn link={p.primary} field="primary" variant="primary" />
          <Btn link={p.secondary} field="secondary" variant="ghost" />
        </div>
        {p.showServiceTimes && (
          <div className="mx-auto mt-16 inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-3xl border md:rounded-full border-fg/10 bg-fg/[0.04] px-8 py-4 backdrop-blur-md">
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">{s.serviceDay}</span>
            {s.serviceTimes.map((t, i) => (
              <span key={i} className="text-sm text-fg/85">
                <span className="text-fg/50">{t.label} · </span>
                <span className="font-semibold">{t.time}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 md:block">
        <div className="h-12 w-[1px] animate-pulse bg-gradient-to-b from-transparent via-[var(--accent)] to-transparent" />
      </div>
    </section>
  );
}

export function PageHeader({ p }: P) {
  return (
    <section className="group/edit relative isolate overflow-hidden grain">
      <div className="aurora -z-10" />
      {p.image && (
        <div className="absolute inset-0 -z-10 opacity-30">
          <Img src={p.image} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="sparkle -z-10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgb(var(--bg-rgb)/0.4)] to-[rgb(var(--bg-rgb))]" />
      <EditHotspot field="image" label="Change background" />
      <div className={`wrap ${p.size === "large" ? "pb-28 pt-48" : "pb-16 pt-40 md:pb-24 md:pt-48"}`}>
        <Txt as="div" className="eyebrow mb-5" value={p.eyebrow} field="eyebrow" />
        <Txt as="h1" className="h-display max-w-4xl text-5xl md:text-7xl" value={p.title} field="title" />
        <Txt as="p" className="mt-6 max-w-2xl text-lg leading-relaxed text-fg/75" value={p.subtitle} field="subtitle" multiline />
      </div>
    </section>
  );
}

export function CardGrid({ p }: P) {
  const items: any[] = p.items || []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const cols = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[p.columns as 2 | 3 | 4] || "md:grid-cols-3";
  return (
    <section className="section-pad">
      <div className="wrap">
        <SectionHead p={p} className="mb-12 md:mb-16" />
        <div className={`grid gap-5 ${cols}`}>
          {items.map((it, i) =>
            p.style === "image" ? (
              <SmartLink key={i} href={it.href} className="reveal group/card relative block aspect-[3/4] overflow-hidden rounded-theme bg-surface">
                <Img src={it.image} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover/card:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/0" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <Txt as="h3" className="h-display text-2xl" value={it.title} field={`items.${i}.title`} />
                  <Txt as="p" className="mt-2 text-sm leading-relaxed text-white/75" value={it.text} field={`items.${i}.text`} multiline />
                  {it.cta && (
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                      <Txt value={it.cta} field={`items.${i}.cta`} /> <ArrowRight className="h-3.5 w-3.5 transition group-hover/card:translate-x-1" />
                    </span>
                  )}
                </div>
              </SmartLink>
            ) : (
              <SmartLink key={i} href={it.href} className="reveal card group/card block p-7 transition hover:-translate-y-1 hover:border-[rgb(var(--accent-rgb)/0.5)]">
                <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.12)] text-accent">
                  <Icon name={it.icon} className="h-7 w-7" />
                </div>
                <Txt as="h3" className="h-display text-xl" value={it.title} field={`items.${i}.title`} />
                <Txt as="p" className="mt-3 text-sm leading-relaxed text-muted" value={it.text} field={`items.${i}.text`} multiline />
                {it.cta && it.href && (
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">
                    <Txt value={it.cta} field={`items.${i}.cta`} /> <ArrowRight className="h-3.5 w-3.5 transition group-hover/card:translate-x-1" />
                  </span>
                )}
              </SmartLink>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

export function SplitFeature({ p }: P) {
  const right = p.imagePosition !== "left";
  return (
    <section className="section-pad">
      <div className="wrap grid items-center gap-12 md:grid-cols-2 md:gap-20">
        <div className={`group/edit reveal relative ${right ? "md:order-2" : ""}`}>
          <div className="absolute -inset-4 -z-10 rounded-[calc(var(--radius)+16px)] bg-gradient-to-br from-[rgb(var(--primary-rgb)/0.35)] to-[rgb(var(--glow-rgb)/0.3)] blur-2xl" />
          <Img src={p.image} className="aspect-[4/3] w-full rounded-theme object-cover" />
          <EditHotspot field="image" />
        </div>
        <div>
          <Txt as="div" className="eyebrow mb-4" value={p.eyebrow} field="eyebrow" />
          <Txt as="h2" className="h-display text-3xl md:text-5xl" value={p.title} field="title" />
          <Txt as="div" className="mt-6 text-base leading-[1.85] text-muted md:text-lg" value={p.text} field="text" multiline />
          <div className="mt-8">
            <Btn link={p.cta} field="cta" variant="ghost" arrow />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Stats({ p }: P) {
  const items: { value: string; label: string }[] = p.items || [];
  return (
    <section className="border-y border-fg/10 bg-[rgb(var(--fg-rgb)/0.02)]">
      <div className={`wrap grid grid-cols-2 ${items.length >= 4 ? "md:grid-cols-4" : items.length === 3 ? "md:grid-cols-3" : ""}`}>
        {items.map((it, i) => (
          <div key={i} className="reveal px-4 py-12 text-center">
            <Txt as="div" className="gold-text font-display text-4xl font-bold md:text-6xl" value={it.value} field={`items.${i}.value`} />
            <Txt as="div" className="mt-3 text-[11px] font-bold uppercase tracking-[0.25em] text-muted" value={it.label} field={`items.${i}.label`} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function Verse({ p }: P) {
  return (
    <section className="section-pad relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,rgb(var(--accent-rgb)/0.10),transparent)]" />
      <div className="wrap relative max-w-4xl text-center">
        <Sparkles className="mx-auto mb-8 h-6 w-6 text-accent" />
        <Txt as="blockquote" className="font-[family-name:var(--font-cormorant)] text-3xl font-medium italic leading-snug md:text-5xl" value={p.text} field="text" multiline />
        <Txt as="div" className="eyebrow mt-8" value={p.reference} field="reference" />
      </div>
    </section>
  );
}

export function CtaBanner({ p }: P) {
  const tone =
    p.tone === "accent"
      ? "bg-[var(--accent)] text-[var(--on-accent)]"
      : p.tone === "dark"
        ? "bg-surface text-fg border border-fg/10"
        : "bg-[var(--primary)] text-[var(--on-primary)]";
  return (
    <section className="py-16 md:py-24">
      <div className="wrap">
        <div className={`reveal relative overflow-hidden rounded-[calc(var(--radius)*1.6)] px-8 py-14 md:px-16 md:py-20 ${tone}`}>
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-black/20 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <Txt as="h2" className="h-display text-3xl md:text-5xl" value={p.title} field="title" />
              <Txt as="p" className="mt-4 text-base leading-relaxed opacity-85 md:text-lg" value={p.text} field="text" multiline />
            </div>
            <div className="flex flex-wrap gap-3">
              <Btn link={p.primary} field="primary" variant={p.tone === "dark" ? "primary" : "light"} />
              <Btn link={p.secondary} field="secondary" variant="ghost" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RichText({ p }: P) {
  return (
    <section className="section-pad">
      <div className={`wrap ${p.align === "center" ? "text-center" : ""}`}>
        <div className={`${p.align === "center" ? "mx-auto" : ""} max-w-3xl`}>
          <Txt as="div" className="eyebrow mb-4" value={p.eyebrow} field="eyebrow" />
          <Txt as="h2" className="h-display text-3xl md:text-5xl" value={p.title} field="title" />
          <Txt as="div" className="mt-6 text-base leading-[1.9] text-muted md:text-lg" value={p.body} field="body" multiline />
        </div>
      </div>
    </section>
  );
}

export function ComingSoon({ p }: P) {
  return (
    <section className="section-pad">
      <div className="wrap">
        <div className="card mx-auto max-w-2xl p-12 text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-[rgb(var(--accent-rgb)/0.12)] text-accent">
            <Icon name={p.icon} className="h-8 w-8" />
          </div>
          <Txt as="h2" className="h-display text-3xl" value={p.title} field="title" />
          <Txt as="p" className="mt-4 text-muted" value={p.text} field="text" multiline />
        </div>
      </div>
    </section>
  );
}

export function Leaders({ p }: P) {
  const items: any[] = p.items || []; // eslint-disable-line @typescript-eslint/no-explicit-any
  return (
    <section className="section-pad">
      <div className="wrap">
        <SectionHead p={p} className="mb-12 md:mb-16" />
        <div className="grid gap-8 md:grid-cols-2">
          {items.map((it, i) => (
            <div key={i} className="reveal group/edit relative overflow-hidden rounded-theme bg-surface">
              <div className="relative aspect-[4/5] overflow-hidden md:aspect-[5/6]">
                <Img src={it.image} alt={it.name} className="h-full w-full object-cover object-top transition duration-700 group-hover/edit:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <EditHotspot field={`items.${i}.image`} label="Change photo" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-7 text-white md:p-9">
                <Txt as="div" className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]" value={it.role} field={`items.${i}.role`} />
                <Txt as="h3" className="h-display mt-2 text-3xl md:text-4xl" value={it.name} field={`items.${i}.name`} />
                <Txt as="p" className="mt-3 max-w-md text-sm leading-relaxed text-white/75" value={it.bio} field={`items.${i}.bio`} multiline />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
