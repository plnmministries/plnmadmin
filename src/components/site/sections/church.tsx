"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarPlus, Check, Clock, Copy, MapPin, Navigation, Phone, QrCode } from "lucide-react";
import QRCode from "qrcode";
import type { ChurchEvent } from "@/lib/types";
import { formatDate, upcomingEvents } from "@/lib/util";
import { ManageChip, Txt, useLang, useSite } from "../context";
import { Icon, WhatsAppIcon, PhonePeLogo, GooglePayLogo, PaytmLogo } from "../icons";
import { deviceOS, goTo, openAppLink, useForms } from "../forms";
import { Img, SectionHead, SmartLink } from "./common";

type P = { p: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Shared text: service day/labels and address, translated. */
function useChurchText() {
  const { content } = useSite();
  const { tr } = useLang();
  const s = content.settings;
  return {
    day: tr("g:settings.serviceDay", s.serviceDay),
    label: (i: number) => tr(`g:settings.serviceTimes.${i}.label`, s.serviceTimes[i]?.label),
    address: tr("g:settings.address", s.address),
  };
}

export function ServiceTimes({ p }: P) {
  const { content } = useSite();
  const t = useChurchText();
  const s = content.settings;
  return (
    <section className="section-pad relative">
      <ManageChip panel="settings" label="Edit service times" />
      <div className="wrap">
        <SectionHead p={p} align="center" className="mb-12 md:mb-14" />
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3 sm:gap-5">
          {s.serviceTimes.map((st, i) => (
            <div key={i} className="reveal card relative overflow-hidden p-7 text-center sm:p-8">
              <div className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-32 w-32 rounded-full bg-[rgb(var(--accent-rgb)/0.25)] blur-3xl" />
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted">{t.label(i)}</div>
              <div className="gold-text mt-3 font-display text-4xl font-bold">{st.time}</div>
              <div className="mt-2 text-sm text-muted">{t.day}</div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 flex max-w-2xl items-start justify-center gap-2 text-center text-sm text-muted">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> <span>{t.address}</span>
        </p>
      </div>
    </section>
  );
}

export function Visit({ p }: P) {
  const { content } = useSite();
  const { ui } = useLang();
  const t = useChurchText();
  const s = content.settings;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.mapQuery)}`;
  const tel = `tel:${s.phone.replace(/\s/g, "")}`;
  return (
    <section className="section-pad">
      <div className="wrap grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex min-w-0 flex-col justify-center">
          <Txt as="div" className="eyebrow mb-4" value={p.eyebrow} field="eyebrow" />
          <Txt as="h2" className="h-display text-4xl md:text-6xl" value={p.title} field="title" />
          <Txt as="p" className="mt-5 max-w-lg text-lg leading-relaxed text-muted" value={p.text} field="text" multiline />
          <div className="mt-8 space-y-4">
            <div className="flex gap-4">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0 leading-relaxed">{t.address}</div>
            </div>
            <div className="flex gap-4">
              <Clock className="mt-1 h-5 w-5 shrink-0 text-accent" />
              <div>
                {t.day}: {s.serviceTimes.map((x) => x.time).join(" · ")}
              </div>
            </div>
            <div className="flex gap-4">
              <Phone className="mt-1 h-5 w-5 shrink-0 text-accent" />
              <a href={tel} className="link-underline -my-2 inline-block py-2">
                {s.phone}
              </a>
            </div>
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={directions} target="_blank" rel="noreferrer" className="btn btn-primary">
              <Navigation className="h-4 w-4" /> {ui("directions")}
            </a>
            <a href={tel} className="btn btn-ghost">
              <Phone className="h-4 w-4" /> {ui("callUs")}
            </a>
          </div>
        </div>
        {p.showMap && (
          <div className="reveal relative h-[340px] overflow-hidden rounded-theme border border-fg/10 sm:h-[420px] lg:h-auto lg:min-h-[420px]">
            <iframe
              title="Map"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery)}&z=15&output=embed`}
              className="absolute inset-0 h-full w-full"
              style={{ filter: "grayscale(0.2) contrast(1.05)" }}
              loading="lazy"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function gcalLink(e: ChurchEvent, address: string) {
  const d = e.startDate.replace(/-/g, "");
  // all-day event: Google's end date is exclusive, so add a day
  const endPlus = new Date(`${e.endDate || e.startDate}T00:00:00Z`);
  endPlus.setUTCDate(endPlus.getUTCDate() + 1);
  const endStr = endPlus.toISOString().slice(0, 10).replace(/-/g, "");
  const params = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${d}/${endStr}`, details: `${e.description}\n\n${e.time}`, location: address });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function useDaysUntil(iso: string) {
  // computed after mount so server and client HTML match
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setN(Math.ceil((new Date(`${iso}T00:00:00+05:30`).getTime() - Date.now()) / 86400000)), 0);
    return () => clearTimeout(t);
  }, [iso]);
  return n;
}

function useEventText(e: ChurchEvent) {
  const { tr } = useLang();
  const f = (k: keyof ChurchEvent) => tr(`e:${e.id}:${k}`, e[k] as string | undefined);
  return { title: f("title"), subtitle: f("subtitle"), time: f("time"), location: f("location"), description: f("description"), tag: f("tag"), ctaLabel: f("ctaLabel") };
}

function EventArt({ e, big }: { e: ChurchEvent; big?: boolean }) {
  const { locale } = useLang();
  const t = useEventText(e);
  const d = new Date(`${e.startDate}T00:00:00`);
  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(135deg,var(--primary),rgb(var(--glow-rgb)/0.9)_70%,#000)]">
      {e.image ? (
        <Img src={e.image} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div className="sparkle" />
          <div className="beams" />
          <div className="absolute inset-0 grid place-items-center text-center text-white">
            <div>
              <div className={`font-display font-bold leading-none ${big ? "text-8xl md:text-9xl" : "text-7xl"}`}>{d.getDate()}</div>
              <div className="mt-3 text-sm font-bold uppercase tracking-[0.4em] text-white/80">{d.toLocaleDateString(locale, { month: "long" })}</div>
            </div>
          </div>
        </>
      )}
      {t.tag && <span className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur">{t.tag}</span>}
    </div>
  );
}

function EventRow({ e, address }: { e: ChurchEvent; address: string }) {
  const { ui, locale } = useLang();
  const t = useEventText(e);
  const n = useDaysUntil(e.startDate);
  return (
    <article className="reveal card grid overflow-hidden md:grid-cols-[0.9fr_1.1fr]">
      <div className="aspect-[4/3] md:aspect-auto md:min-h-[360px]">
        <EventArt e={e} big />
      </div>
      <div className="flex min-w-0 flex-col justify-center p-6 sm:p-8 md:p-12">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
          <span>{formatDate(e.startDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, locale)}</span>
          {n != null && n > 0 && <span className="rounded-full bg-[rgb(var(--accent-rgb)/0.12)] px-2.5 py-1 normal-case tracking-normal">{ui("inDays", { n })}</span>}
        </div>
        <h3 className="h-display mt-4 text-3xl md:text-4xl">{t.title}</h3>
        {t.subtitle && <p className="mt-2 text-lg text-fg/80">{t.subtitle}</p>}
        <p className="mt-5 leading-relaxed text-muted">{t.description}</p>
        <div className="mt-6 space-y-2 text-sm">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> <span className={/soon|త్వరలో|जल्द/i.test(t.time) ? "italic text-fg/80" : ""}>{t.time}</span>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {t.location}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={gcalLink(e, address)} target="_blank" rel="noreferrer" className="btn btn-primary">
            <CalendarPlus className="h-4 w-4" /> {ui("addToCalendar")}
          </a>
          {t.ctaLabel && e.ctaHref && (
            <SmartLink href={e.ctaHref} className="btn btn-ghost">
              {t.ctaLabel}
            </SmartLink>
          )}
        </div>
      </div>
    </article>
  );
}

function EventCard({ e }: { e: ChurchEvent }) {
  const { locale } = useLang();
  const t = useEventText(e);
  return (
    <SmartLink href="/events" className="reveal card group block overflow-hidden transition hover:-translate-y-1">
      <div className="aspect-[16/10] overflow-hidden">
        <EventArt e={e} />
      </div>
      <div className="p-6 sm:p-7">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">{formatDate(e.startDate, { weekday: "short", day: "numeric", month: "long" }, locale)}</div>
        <h3 className="h-display mt-3 text-2xl transition-colors group-hover:text-accent">{t.title}</h3>
        <div className="mt-3 flex items-start gap-2 text-sm text-muted">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" /> {t.time}
        </div>
      </div>
    </SmartLink>
  );
}

export function EventsList({ p }: P) {
  const { content } = useSite();
  const { ui } = useLang();
  const address = useChurchText().address;
  const events = upcomingEvents(content).slice(0, p.limit || 20);
  return (
    <section className={`${p.layout === "list" ? "pb-20 pt-10 md:pb-28" : "section-pad"} relative`}>
      <ManageChip panel="events" label="Manage events" />
      <div className="wrap">
        {p.layout !== "list" && (
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6 md:mb-12">
            <SectionHead p={p} />
            {p.ctaLabel && (
              <SmartLink href="/events" className="btn btn-ghost">
                <Txt value={p.ctaLabel} field="ctaLabel" /> <ArrowRight className="h-4 w-4" />
              </SmartLink>
            )}
          </div>
        )}
        {events.length === 0 && <div className="card p-12 text-center text-muted">{ui("noEvents")}</div>}
        {p.layout === "list" ? (
          <div className="space-y-8">
            {events.map((e) => (
              <EventRow key={e.id} e={e} address={address} />
            ))}
          </div>
        ) : (
          <div className={`grid gap-6 md:grid-cols-2 ${events.length >= 3 ? "lg:grid-cols-3" : ""}`}>
            {events.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Giving (UPI) ----------

const UPI_APPS = [
  { id: "phonepe", name: "PhonePe", Logo: PhonePeLogo, ios: "phonepe://pay", android: "com.phonepe.app" },
  { id: "gpay", name: "Google Pay", Logo: GooglePayLogo, ios: "gpay://upi/pay", android: "com.google.android.apps.nbu.paisa.user" },
  { id: "paytm", name: "Paytm", Logo: PaytmLogo, ios: "paytmmp://pay", android: "net.one97.paytm" },
] as const;

export function Giving({ p }: P) {
  const { content } = useSite();
  const { ui, tr } = useLang();
  const g = content.settings.giving;
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const params = g.upiId ? `pa=${encodeURIComponent(g.upiId)}&pn=${encodeURIComponent(g.payeeName)}&cu=INR&tn=${encodeURIComponent("Offering")}` : "";

  useEffect(() => {
    if (g.qrImage || !params) return;
    QRCode.toDataURL(`upi://pay?${params}`, { width: 520, margin: 1, color: { dark: "#111111", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
  }, [g.qrImage, params]);

  const qrSrc = g.qrImage || (params ? qr : "");

  const pay = (app: (typeof UPI_APPS)[number]) => {
    setMsg("");
    if (!params) return setMsg(ui("upiSoon"));
    const os = deviceOS();
    if (os === "android") {
      // opens that exact app; Android sends the visitor to the Play Store if it isn't installed
      goTo(`intent://pay?${params}#Intent;scheme=upi;package=${app.android};end`);
    } else if (os === "ios") {
      openAppLink(`${app.ios}?${params}`, () => setMsg(ui("appMissing")));
    } else {
      setMsg(ui("openOnPhone"));
      document.getElementById("upi-qr")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section className="section-pad relative">
      <ManageChip panel="giving" label="Edit UPI & QR" />
      <div className="wrap">
        <SectionHead p={p} align="center" className="mb-10 md:mb-14" />
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.1fr_1fr]">
          <div className="reveal card flex flex-col p-6 sm:p-8 md:p-10">
            <div className="eyebrow">{ui("payWith")}</div>
            <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
              {UPI_APPS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => pay(a)}
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-fg/10 bg-[rgb(var(--bg-rgb)/0.5)] px-2 py-5 transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.6)] active:scale-[0.98]"
                  aria-label={`Pay with ${a.name}`}
                >
                  <a.Logo className="h-12 w-12 sm:h-14 sm:w-14" />
                  <span className="text-[13px] font-semibold">{a.name}</span>
                </button>
              ))}
            </div>
            {msg && <p className="mt-4 rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] p-3 text-center text-sm text-fg/85">{msg}</p>}
            <div className="mt-6 rounded-2xl border border-fg/10 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{ui("upiId")}</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className={`min-w-0 truncate text-lg font-semibold ${g.upiId ? "" : "text-base italic text-muted"}`}>{g.upiId || ui("upiSoon")}</div>
                {g.upiId && (
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(g.upiId).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      })
                    }
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-fg/15 px-3 py-2 text-xs font-semibold text-fg/80 transition hover:border-[var(--accent)] hover:text-accent"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "✓" : ui("copy")}
                  </button>
                )}
              </div>
              {g.payeeName && <div className="mt-1 text-sm text-muted">{g.payeeName}</div>}
            </div>
          </div>
          <div id="upi-qr" className="reveal card relative flex flex-col items-center overflow-hidden p-6 text-center sm:p-8 md:p-10">
            <div className="pointer-events-none absolute -top-24 h-48 w-48 rounded-full bg-[rgb(var(--accent-rgb)/0.25)] blur-3xl" />
            <div className="eyebrow">{ui("scanGive")}</div>
            <div className="mt-6 rounded-2xl bg-white p-3 shadow-2xl sm:p-4">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt="UPI QR code" className="h-52 w-52 object-contain sm:h-56 sm:w-56" />
              ) : (
                <div className="grid h-52 w-52 place-items-center text-neutral-400 sm:h-56 sm:w-56">
                  <div>
                    <QrCode className="mx-auto h-12 w-12" />
                    <div className="mt-2 text-sm">{ui("qrSoon")}</div>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-5 text-sm text-muted">{ui("openOnPhone")}</p>
          </div>
        </div>
        {g.note && <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted">{tr("g:settings.giving.note", g.note)}</p>}
      </div>
    </section>
  );
}

// ---------- Get connected ----------

export function ConnectOptions({ p }: P) {
  const { content } = useSite();
  const { tr } = useLang();
  const { open } = useForms();
  const forms = content.settings.connectForms;
  return (
    <section className="section-pad relative">
      <ManageChip panel="connect" label="Edit forms & WhatsApp number" />
      <div className="wrap">
        <SectionHead p={p} align="center" className="mb-10 md:mb-14" />
        <div className={`grid gap-5 sm:gap-6 ${forms.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {forms.map((f) => (
            <div key={f.id} className="reveal card group relative flex flex-col overflow-hidden p-7 transition hover:-translate-y-1 hover:border-[rgb(var(--accent-rgb)/0.5)] md:p-10">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[rgb(var(--primary-rgb)/0.18)] blur-3xl transition group-hover:bg-[rgb(var(--accent-rgb)/0.25)]" />
              <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.12)] text-accent md:mb-8 md:h-16 md:w-16">
                <Icon name={f.icon} className="h-7 w-7 md:h-8 md:w-8" />
              </div>
              <h3 className="h-display text-2xl md:text-3xl">{tr(`f:${f.id}:title`, f.title)}</h3>
              <p className="mt-4 flex-1 leading-relaxed text-muted">{tr(`f:${f.id}:text`, f.text)}</p>
              <button onClick={() => open(f.id)} className="btn btn-primary mt-8 self-start">
                <WhatsAppIcon className="h-4 w-4" /> {tr(`f:${f.id}:buttonLabel`, f.buttonLabel)}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
