"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { ConnectForm } from "@/lib/types";
import { useLang, useSite } from "./context";
import { Icon, WhatsAppIcon } from "./icons";

// ---------- device + app links ----------

export function deviceOS(): "android" | "ios" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "desktop";
}

/** Navigates to an app/intent link (kept outside components for the hooks linter). */
export function goTo(url: string) {
  window.location.assign(url);
}

/**
 * Opens a native app link; if the page is still visible shortly after (app not installed),
 * runs the fallback instead.
 */
export function openAppLink(url: string, fallback: () => void, wait = 1600) {
  let left = false;
  const onHide = () => {
    if (document.visibilityState === "hidden") left = true;
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
  goTo(url);
  setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
    if (!left && document.visibilityState === "visible") fallback();
  }, wait);
}

/** Opens a WhatsApp chat with `number`, with `text` already typed in the message box. */
export function openWhatsApp(number: string, text: string) {
  const digits = number.replace(/\D/g, "");
  const enc = encodeURIComponent(text);
  const web = `https://wa.me/${digits}?text=${enc}`;
  const os = deviceOS();
  if (os === "android") {
    // intent:// opens WhatsApp (or WhatsApp Business) directly; falls back to wa.me if neither is installed
    goTo(`intent://send?phone=${digits}&text=${enc}#Intent;scheme=whatsapp;S.browser_fallback_url=${encodeURIComponent(web)};end`);
  } else if (os === "ios") {
    openAppLink(`whatsapp://send?phone=${digits}&text=${enc}`, () => goTo(web));
  } else {
    window.open(web, "_blank", "noopener");
  }
}

// ---------- form modal ----------

const FormsCtx = createContext<{ open: (formId: string) => void }>({ open: () => {} });
export const useForms = () => useContext(FormsCtx);

export function FormsProvider({ children }: { children: ReactNode }) {
  const { content, editing } = useSite();
  const [form, setForm] = useState<ConnectForm | null>(null);
  const open = useCallback(
    (id: string) => {
      if (editing) return;
      const f = content.settings.connectForms.find((x) => x.id === id);
      if (f) setForm(f);
    },
    [content.settings.connectForms, editing],
  );
  return (
    <FormsCtx.Provider value={{ open }}>
      {children}
      {form && <ConnectModal form={form} onClose={() => setForm(null)} />}
    </FormsCtx.Provider>
  );
}

function ConnectModal({ form, onClose }: { form: ConnectForm; onClose: () => void }) {
  const { content } = useSite();
  const { ui, tr } = useLang();
  const s = content.settings;
  const [vals, setVals] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setVals((x) => ({ ...x, [k]: v }));
  const ready = s.whatsapp.replace(/\D/g, "").length >= 10;
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // focus without making iOS zoom/jump before the sheet animates in
    const t = setTimeout(() => first.current?.focus({ preventScroll: true }), 250);
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Message labels stay in English so the church team reads every request the same way.
    const lines = [form.whatsappIntro, "", `Name: ${vals.name?.trim() || ""}`];
    if (vals.phone?.trim()) lines.push(`Phone: ${vals.phone.trim()}`);
    (form.extraFields || []).forEach((f) => vals[f]?.trim() && lines.push(`${f}: ${vals[f].trim()}`));
    if (form.askMessage && vals.message?.trim()) lines.push("", vals.message.trim());
    openWhatsApp(s.whatsapp, lines.join("\n"));
    onClose();
  };

  const input =
    "w-full rounded-xl border border-fg/15 bg-[rgb(var(--bg-rgb)/0.6)] px-4 py-3.5 text-base outline-none placeholder:text-muted focus:border-[var(--accent)]";
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true">
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-b-none p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-b-[var(--radius)] sm:p-9"
      >
        <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full hover:bg-fg/10" aria-label={ui("close")}>
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.12)] text-accent">
          <Icon name={form.icon} className="h-6 w-6" />
        </div>
        <h3 className="h-display pr-10 text-2xl">{tr(`f:${form.id}:title`, form.title)}</h3>
        <p className="mt-2 text-sm text-muted">{ui("formIntro")}</p>
        <div className="mt-6 space-y-3">
          <input ref={first} required autoComplete="name" placeholder={`${ui("yourName")} *`} className={input} value={vals.name || ""} onChange={(e) => set("name", e.target.value)} />
          <input type="tel" autoComplete="tel" inputMode="tel" placeholder={`${ui("phone")} (${ui("optional")})`} className={input} value={vals.phone || ""} onChange={(e) => set("phone", e.target.value)} />
          {(form.extraFields || []).map((f, i) => (
            <input key={f} placeholder={tr(`f:${form.id}:extra.${i}`, f)} className={input} value={vals[f] || ""} onChange={(e) => set(f, e.target.value)} />
          ))}
          {form.askMessage && (
            <textarea rows={4} placeholder={tr(`f:${form.id}:messageLabel`, form.messageLabel || "")} className={input} value={vals.message || ""} onChange={(e) => set("message", e.target.value)} />
          )}
        </div>
        {ready ? (
          <button type="submit" className="btn mt-6 w-full bg-[#25D366] !py-4 text-white">
            <WhatsAppIcon className="h-5 w-5" /> {ui("continueWa")}
          </button>
        ) : (
          <div className="mt-6 rounded-xl border border-fg/10 p-4 text-center text-sm text-muted">
            {ui("waSoon")}{" "}
            <a className="font-semibold text-accent" href={`tel:${s.phone.replace(/\s/g, "")}`}>
              {s.phone}
            </a>
          </div>
        )}
      </form>
    </div>
  );
}
