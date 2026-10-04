"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, Globe, Mail, MapPin, Menu, Phone, X } from "lucide-react";
import { pageHref } from "@/lib/util";
import { Txt, useLang, useSite } from "./context";
import { LANGS } from "@/lib/i18n";
import { useLive } from "./video";
import { SmartLink } from "./sections/common";
import { FacebookIcon, InstagramIcon, WhatsAppIcon, XIcon, YouTubeIcon } from "./icons";

function useNav() {
  const { content } = useSite();
  const { tr } = useLang();
  return content.pages
    .filter((p) => p.slug && p.showInNav && !p.hidden)
    .map((p) => ({ label: tr(`p:${p.id}:navLabel`, p.navLabel || p.title), href: pageHref(p.slug), slug: p.slug }));
}

export function Wordmark({ compact }: { compact?: boolean }) {
  const { content } = useSite();
  const s = content.settings;
  return (
    <span className="flex min-w-0 items-center gap-2 sm:gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.emblem} alt={s.churchName} className={`w-auto shrink-0 transition-all ${compact ? "h-9 sm:h-10" : "h-10 sm:h-12 md:h-14"}`} />
      <span className="min-w-0 leading-none" lang="en">
        <span className="block whitespace-nowrap font-[family-name:var(--font-cinzel)] text-[clamp(10.5px,3.3vw,15px)] font-semibold tracking-[0.14em] sm:tracking-[0.22em] md:text-lg">
          {s.shortName.toUpperCase()}
        </span>
        <span className="mt-1 block whitespace-nowrap font-[family-name:var(--font-cinzel)] text-[clamp(7.5px,2.2vw,9px)] tracking-[0.5em] text-fg/60 sm:tracking-[0.62em] md:text-[10px]">MINISTRIES</span>
      </span>
    </span>
  );
}

export function LangSwitcher({ className = "", up = false }: { className?: string; up?: boolean }) {
  const { lang, setLang, ui } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const cur = LANGS.find((l) => l.code === lang)!;
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={ui("language")}
        aria-expanded={open}
        className="flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-fg/15 px-2.5 text-[13px] font-semibold transition hover:border-[var(--accent)] sm:h-11 sm:px-3"
      >
        <Globe className="h-4 w-4 shrink-0 opacity-80" />
        <span className="leading-none">{cur.short}</span>
      </button>
      {open && (
        <div className={`absolute right-0 z-[60] w-44 overflow-hidden rounded-2xl border border-fg/10 bg-surface p-1.5 shadow-2xl ${up ? "bottom-12" : "top-12"}`} role="menu">
          {LANGS.map((l) => (
            <button
              key={l.code}
              role="menuitemradio"
              aria-checked={l.code === lang}
              onClick={(e) => {
                e.stopPropagation();
                setLang(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-[15px] transition ${l.code === lang ? "bg-[rgb(var(--accent-rgb)/0.14)] font-semibold text-accent" : "hover:bg-fg/5"}`}
            >
              <span lang={l.code}>{l.label}</span>
              {l.code === lang && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Remembers a dismissed announcement for the browser session.
const barListeners = new Set<() => void>();
function subscribeBar(fn: () => void) {
  barListeners.add(fn);
  return () => barListeners.delete(fn);
}
function readBar() {
  try {
    return sessionStorage.getItem("plnm-bar");
  } catch {
    return null;
  }
}
function dismissBar(text: string) {
  try {
    sessionStorage.setItem("plnm-bar", text);
  } catch {}
  barListeners.forEach((f) => f());
}

export function Header() {
  const { content, page, editing, bridge } = useSite();
  const { ui, tr } = useLang();
  const nav = useNav();
  const live = useLive();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hdr, setHdr] = useState(96);
  const ref = useRef<HTMLElement>(null);
  const a = content.settings.announcement;
  const hideBar = useSyncExternalStore(subscribeBar, () => readBar() === a.text, () => false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // header height (announcement can wrap on phones) so the mobile menu starts just below it
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setHdr(Math.round(e.contentRect.height)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const liveLabel = live.live ? ui("liveNow") : ui("watchLive");

  return (
    <>
      <header ref={ref} className={`fixed inset-x-0 top-0 z-50 ${editing ? "cursor-pointer" : ""}`} onClick={editing ? () => bridge?.select("__header") : undefined}>
        {a.enabled && a.text && !hideBar && (
          <div className="relative bg-[var(--primary)] text-[var(--on-primary)]">
            <SmartLink href={a.href} className="wrap flex items-center justify-center gap-2 py-2 !pr-11 text-center text-[12px] font-semibold leading-snug sm:text-xs md:text-sm">
              <Txt value={a.text} global="settings.announcement.text" />
              {a.href && <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 sm:block" />}
            </SmartLink>
            {!editing && (
              <button aria-label={ui("dismiss")} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center opacity-75 hover:opacity-100" onClick={() => dismissBar(a.text)}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className={`transition-all duration-300 ${scrolled || open ? "border-b border-fg/10 bg-[rgb(var(--bg-rgb)/0.88)] backdrop-blur-xl" : "bg-gradient-to-b from-[rgb(var(--bg-rgb)/0.75)] to-transparent"}`}>
          <div className={`wrap flex items-center justify-between gap-3 transition-all max-[359px]:!px-3.5 ${scrolled ? "h-16 md:h-[72px]" : "h-[72px] md:h-24"}`}>
            <SmartLink href="/" className="min-w-0 shrink" onClick={() => setOpen(false)}>
              <Wordmark compact={scrolled} />
            </SmartLink>
            <nav className="hidden items-center gap-5 lg:flex xl:gap-8">
              {nav.map((n) => (
                <SmartLink
                  key={n.href}
                  href={n.href}
                  className={`whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.16em] transition-colors xl:text-[13px] hover:text-accent ${page.slug === n.slug ? "text-accent" : "text-fg/85"}`}
                >
                  {n.label}
                </SmartLink>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
              <SmartLink href="/sermons#live" className="btn btn-primary hidden !px-5 !py-2.5 md:inline-flex">
                {live.live && <span className="live-dot !bg-white" />}
                {liveLabel}
              </SmartLink>
              <LangSwitcher />
              <button onClick={() => setOpen((v) => !v)} aria-label={ui("menu")} aria-expanded={open} className="grid h-10 w-10 place-items-center rounded-full border border-fg/15 sm:h-11 sm:w-11 lg:hidden">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-[var(--bg)] lg:hidden" style={{ paddingTop: hdr + 8 }}>
          <div className="aurora pointer-events-none opacity-60" />
          <nav className="wrap relative flex flex-col pb-[max(2rem,env(safe-area-inset-bottom))]">
            {[{ label: ui("home"), href: "/", slug: "" }, ...nav].map((n) => (
              <SmartLink
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`h-display border-b border-fg/10 py-4 text-[clamp(1.5rem,7vw,2rem)] ${page.slug === n.slug ? "text-accent" : ""}`}
              >
                {n.label}
              </SmartLink>
            ))}
            <SmartLink href="/sermons#live" onClick={() => setOpen(false)} className="btn btn-primary mt-8 !py-4">
              {live.live && <span className="live-dot !bg-white" />} {liveLabel}
            </SmartLink>
            <div className="mt-8 text-center text-sm text-muted">
              {tr("g:settings.serviceDay", content.settings.serviceDay)} · {content.settings.serviceTimes.map((t) => t.time).join(" · ")}
            </div>
            <Socials className="mt-6 justify-center" />
          </nav>
        </div>
      )}
    </>
  );
}

export function Socials({ className = "" }: { className?: string }) {
  const { content } = useSite();
  const so = content.settings.socials;
  const items = [
    { href: so.youtube, Icon: YouTubeIcon, label: "YouTube" },
    { href: so.instagram, Icon: InstagramIcon, label: "Instagram" },
    { href: so.facebook, Icon: FacebookIcon, label: "Facebook" },
    { href: so.x, Icon: XIcon, label: "X" },
    { href: so.whatsappChannel, Icon: WhatsAppIcon, label: "WhatsApp channel" },
  ].filter((i) => i.href);
  return (
    <div className={`flex gap-2 ${className}`}>
      {items.map(({ href, Icon, label }) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-fg/15 text-fg/80 transition hover:border-[var(--accent)] hover:text-accent">
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

export function Footer() {
  const { content, editing, bridge } = useSite();
  const { ui, tr } = useLang();
  const s = content.settings;
  const nav = useNav();
  return (
    <footer className={`relative overflow-hidden border-t border-fg/10 bg-surface ${editing ? "cursor-pointer" : ""}`} onClick={editing ? () => bridge?.select("__footer") : undefined}>
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-[rgb(var(--primary-rgb)/0.18)] blur-3xl" />
      <div className="wrap relative grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:py-20">
        <div>
          <Wordmark />
          <Txt as="p" className="mt-6 max-w-sm text-sm leading-relaxed text-muted" value={s.footerBlurb} global="settings.footerBlurb" multiline />
          <Socials className="mt-6" />
        </div>
        <div>
          <div className="eyebrow mb-5">{ui("explore")}</div>
          <ul className="space-y-3 text-sm">
            {nav.map((n) => (
              <li key={n.href}>
                <SmartLink href={n.href} className="link-underline text-fg/80 hover:text-fg">
                  {n.label}
                </SmartLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-5">{tr("g:settings.serviceDay", s.serviceDay)}</div>
          <ul className="space-y-3 text-sm text-fg/80">
            {s.serviceTimes.map((t, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="text-muted">{tr(`g:settings.serviceTimes.${i}.label`, t.label)}</span>
                <span className="font-semibold">{t.time}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-5">{ui("contact")}</div>
          <ul className="space-y-4 text-sm text-fg/80">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> <span className="min-w-0">{tr("g:settings.address", s.address)}</span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="link-underline">
                {s.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <a href={`mailto:${s.email}`} className="link-underline break-all">
                {s.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-fg/10">
        <div className="wrap flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted md:flex-row">
          <span>
            © {new Date().getFullYear()} {s.churchName}. {ui("rights")}
          </span>
          <span className="telugu text-sm text-fg/60">{s.teluguName}</span>
        </div>
      </div>
    </footer>
  );
}
