"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Calendar, Check, ChevronDown, Church, CloudOff, Command, ExternalLink, HandCoins, History, Loader2, LogOut, MessageCircle, Monitor,
  Palette, PanelsTopLeft, PlayCircle, Plus, Redo2, Rocket, Search, Smartphone, Tablet, Undo2, Files, X, Languages, UserCog,
} from "lucide-react";
import { LANGS, type Lang } from "@/lib/i18n";
import type { SiteContent } from "@/lib/types";
import { setPath } from "@/lib/util";
import { SECTIONS } from "@/components/site/registry";
import { EditorApiCtx, useApi, type EditorApi, type PanelId } from "./api";
import { newSection, sectionAction, setTranslation, updatePage, updateSectionProp, useEditor } from "./useEditor";
import { AccountPanel, ConnectPanel, EventsPanel, GivingPanel, HealthPanel, HistoryPanel, Inspector, PagesPanel, SectionsPanel, SettingsPanel, ThemePanel, TranslationsPanel, useIssues } from "./panels";
import { SermonsPanel } from "./SermonsPanel";

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTH: Record<Device, number> = { desktop: 1366, tablet: 820, mobile: 390 };

const RAIL: { id: PanelId; label: string; Icon: typeof Monitor }[] = [
  { id: "sections", label: "Sections", Icon: PanelsTopLeft },
  { id: "pages", label: "Pages & menu", Icon: Files },
  { id: "sermons", label: "Sermons", Icon: PlayCircle },
  { id: "events", label: "Events", Icon: Calendar },
  { id: "giving", label: "Giving", Icon: HandCoins },
  { id: "connect", label: "Get connected", Icon: MessageCircle },
  { id: "settings", label: "Church info", Icon: Church },
  { id: "theme", label: "Theme", Icon: Palette },
  { id: "translations", label: "Translations", Icon: Languages },
  { id: "history", label: "History", Icon: History },
  { id: "health", label: "Site health", Icon: Activity },
  { id: "account", label: "Account & login", Icon: UserCog },
];

type Toast = { id: number; msg: string; tone: "ok" | "err" };

export default function Editor({ initial, hasDraft, siteUrl = "" }: { initial: SiteContent; hasDraft: boolean; siteUrl?: string }) {
  const ed = useEditor(initial, hasDraft);
  const { content } = ed;
  const [pageId, setPageIdRaw] = useState(content.pages[0].id);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [focusField, setFocusField] = useState<string | undefined>();
  const [panel, setPanel] = useState<PanelId>("sections");
  const [device, setDevice] = useState<Device>("desktop");
  const [editLang, setEditLang] = useState<Lang>("en");
  const [addAt, setAddAt] = useState<number | null>(null);
  const [palette, setPalette] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const frame = useRef<HTMLIFrameElement>(null);
  // bumps every time the canvas (re)announces itself, so state is always re-sent
  const [frameReady, setFrameReady] = useState(0);

  const toast = useCallback((msg: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const post = useCallback((msg: unknown) => frame.current?.contentWindow?.postMessage({ source: "plnm-editor", ...(msg as object) }, window.location.origin), []);

  const setPageId = useCallback((id: string) => {
    setPageIdRaw(id);
    setSelectedId(undefined);
  }, []);

  const select = useCallback(
    (id?: string, field?: string) => {
      setSelectedId(id);
      setFocusField(field);
      if (id && !id.startsWith("__")) post({ type: "scrollTo", id });
    },
    [post],
  );

  const openPanel = useCallback((p: PanelId) => {
    setPanel(p);
    if (p !== "sections") setSelectedId(undefined);
  }, []);

  const page = content.pages.find((p) => p.id === pageId) || content.pages[0];

  // keep the canvas in sync with editor state
  useEffect(() => {
    if (frameReady > 0) post({ type: "state", content, pageId: page.id, selectedId, lang: editLang });
  }, [frameReady, content, page.id, selectedId, editLang, post]);

  const insertSection = useCallback(
    (type: string, index: number) => {
      const s = newSection(type);
      ed.commit((c) => updatePage(c, page.id, (p) => ({ ...p, sections: [...p.sections.slice(0, index), s, ...p.sections.slice(index)] })));
      setAddAt(null);
      setPanel("sections");
      setTimeout(() => select(s.id), 60);
    },
    [ed, page.id, select],
  );

  const handleKey = (e: { key: string; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return false;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) return ed.undo(), true;
    if ((k === "z" && e.shiftKey) || k === "y") return ed.redo(), true;
    if (k === "k") return setPalette((v) => !v), true;
    if (k === "s") return ed.flush().then(() => toast("Draft saved")), true;
    return false;
  };

  // messages from the canvas iframe
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.source !== "plnm-preview") return;
      const m = e.data;
      if (m.type === "ready") setFrameReady((n) => n + 1);
      if (m.type === "select") {
        setPanel((p) => (p === "sections" || m.id?.startsWith("__") ? p : "sections"));
        setSelectedId(m.id);
        setFocusField(m.field);
      }
      if (m.type === "edit") ed.commit((c) => updateSectionProp(c, page.id, m.id, m.field, m.value), `${m.id}.${m.field}`);
      if (m.type === "editGlobal") ed.commit((c) => setPath(c, m.path, m.value), m.path);
      if (m.type === "editTr" && editLang !== "en") ed.commit((c) => setTranslation(c, editLang, m.key, m.value), `tr.${editLang}.${m.key}`);
      if (m.type === "action") {
        if (m.action === "insert") {
          const idx = page.sections.findIndex((s) => s.id === m.id);
          setAddAt(idx + 1);
        } else {
          if (m.action === "delete" && !confirm("Delete this section? You can undo with ⌘Z.")) return;
          const r = sectionAction(content, page.id, m.id, m.action);
          ed.commit(() => r.content);
          if (r.select) setSelectedId(r.select);
          if (m.action === "delete") setSelectedId(undefined);
        }
      }
      if (m.type === "openPanel") openPanel(m.panel);
      if (m.type === "navigate") {
        const slug = String(m.href).split(/[?#]/)[0].replace(/^\//, "");
        const target = content.pages.find((p) => p.slug === slug);
        if (target) setPageId(target.id);
      }
      if (m.type === "key") handleKey(m);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  });

  const publish = useCallback(
    async (label: string) => {
      await ed.flush();
      const r = await fetch("/api/admin/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
      if (r.ok) {
        ed.setHasDraft(false);
        setPublishOpen(false);
        toast("Published! Your changes are live 🎉");
      } else toast("Publish failed — please try again", "err");
    },
    [ed, toast],
  );

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.closest("input, textarea, select, [contenteditable]");
      if (e.key === "Escape") {
        setPalette(false);
        setAddAt(null);
        if (!typing) setSelectedId(undefined);
      }
      if (typing && e.key.toLowerCase() === "z") return; // native text undo inside inputs
      if (handleKey(e)) e.preventDefault();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  const issues = useIssues(content, { setPageId, openPanel, select });
  const warnCount = issues.filter((i) => i.level === "warn").length;

  const api: EditorApi = { ed, content, pageId: page.id, setPageId, selectedId, focusField, select, panel, openPanel, openAddSection: setAddAt, toast, editLang, setEditLang };

  const wide = panel === "sermons" || panel === "translations";
  const showInspector = panel === "sections" && !!selectedId;

  return (
    <EditorApiCtx.Provider value={api}>
      <div className="flex h-screen flex-col bg-neutral-100 font-[family-name:var(--font-manrope)] text-neutral-900">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3">
          <a href={`${siteUrl}/`} target="_blank" className="flex items-center gap-2 pr-2" title="Open live site">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={content.settings.emblem} alt="" className="h-8 w-auto" />
            <span className="hidden text-[13px] font-bold xl:block">{content.settings.shortName}</span>
          </a>
          <PagePicker />
          <div className="mx-auto flex items-center rounded-lg bg-neutral-100 p-0.5">
            {(
              [
                ["desktop", Monitor],
                ["tablet", Tablet],
                ["mobile", Smartphone],
              ] as const
            ).map(([d, I]) => (
              <button key={d} title={d} onClick={() => setDevice(d)} className={`rounded-md px-2.5 py-1.5 ${device === d ? "bg-white shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}>
                <I className="h-4 w-4" />
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-lg bg-neutral-100 p-0.5" title="Language shown on the canvas. Click text to edit that language.">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setEditLang(l.code)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${editLang === l.code ? "bg-white text-sky-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
              >
                {l.short}
              </button>
            ))}
          </div>
          <button onClick={() => setPalette(true)} className="hidden items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[12px] text-neutral-500 hover:bg-neutral-50 lg:flex">
            <Search className="h-3.5 w-3.5" /> Search or jump to… <kbd className="rounded bg-neutral-100 px-1 text-[10px]">⌘K</kbd>
          </button>
          <button onClick={() => openPanel("health")} title="Site health" className={`relative rounded-lg p-2 ${warnCount ? "text-amber-600" : "text-emerald-600"} hover:bg-neutral-100`}>
            <Activity className="h-4 w-4" />
            {warnCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">{warnCount}</span>}
          </button>
          <div className="flex items-center">
            <button onClick={ed.undo} disabled={!ed.canUndo} title="Undo (⌘Z)" className="rounded-lg p-2 hover:bg-neutral-100 disabled:opacity-30">
              <Undo2 className="h-4 w-4" />
            </button>
            <button onClick={ed.redo} disabled={!ed.canRedo} title="Redo (⇧⌘Z)" className="rounded-lg p-2 hover:bg-neutral-100 disabled:opacity-30">
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          <SaveBadge />
          <a href={`/${page.slug}?preview=draft`} target="_blank" className="hidden items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-[12px] font-semibold hover:bg-neutral-50 md:flex" title="Preview unpublished changes in a new tab">
            <ExternalLink className="h-3.5 w-3.5" /> Preview
          </a>
          <div className="relative">
            <button
              onClick={() => setPublishOpen((v) => !v)}
              disabled={!ed.hasDraft}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-700 disabled:bg-neutral-300"
            >
              <Rocket className="h-3.5 w-3.5" /> Publish
            </button>
            {publishOpen && <PublishPopover onPublish={publish} onClose={() => setPublishOpen(false)} />}
          </div>
          <button
            title="Log out"
            onClick={async () => {
              await ed.flush();
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.replace("/admin/login");
            }}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Icon rail */}
          <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-neutral-200 bg-white py-2">
            {RAIL.map(({ id, label, Icon }) => (
              <button key={id} title={label} onClick={() => openPanel(id)} className={`group relative grid h-10 w-10 place-items-center rounded-lg ${panel === id ? "bg-sky-50 text-sky-700" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"}`}>
                <Icon className="h-[18px] w-[18px]" />
                {id === "health" && warnCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />}
                <span className="pointer-events-none absolute left-12 z-50 hidden whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white group-hover:block">{label}</span>
              </button>
            ))}
          </nav>

          {/* Left panel */}
          <aside className={`${wide ? "w-[400px]" : "w-[300px]"} shrink-0 overflow-y-auto border-r border-neutral-200 bg-white`}>
            {panel === "sections" && <SectionsPanel />}
            {panel === "pages" && <PagesPanel />}
            {panel === "sermons" && <SermonsPanel />}
            {panel === "events" && <EventsPanel />}
            {panel === "giving" && <GivingPanel />}
            {panel === "connect" && <ConnectPanel />}
            {panel === "settings" && <SettingsPanel />}
            {panel === "theme" && <ThemePanel />}
            {panel === "history" && <HistoryPanel />}
            {panel === "health" && <HealthPanel />}
            {panel === "translations" && <TranslationsPanel />}
            {panel === "account" && <AccountPanel />}
          </aside>

          {/* Canvas */}
          <Canvas frameRef={frame} device={device} onLoad={() => post({ type: "ping" })} />

          {/* Inspector */}
          {showInspector && (
            <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-neutral-200 bg-white">
              <Inspector />
            </aside>
          )}
        </div>

        {addAt !== null && <AddSectionModal onPick={(t) => insertSection(t, addAt)} onClose={() => setAddAt(null)} />}
        {palette && <CommandPalette onClose={() => setPalette(false)} setDevice={setDevice} openPublish={() => setPublishOpen(true)} siteUrl={siteUrl} />}

        <div className="pointer-events-none fixed bottom-5 left-1/2 z-[300] flex -translate-x-1/2 flex-col items-center gap-2">
          {toasts.map((t) => (
            <div key={t.id} className={`pointer-events-auto rounded-lg px-4 py-2.5 text-[13px] font-medium text-white shadow-xl ${t.tone === "err" ? "bg-red-600" : "bg-neutral-900"}`}>
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </EditorApiCtx.Provider>
  );
}

function SaveBadge() {
  const { ed } = useApi();
  const s = ed.saveState;
  if (s === "saving")
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  if (s === "error" || s === "offline")
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-red-600">
        <CloudOff className="h-3.5 w-3.5" /> {s === "offline" ? "Offline — will retry" : "Not saved — retrying"}
      </span>
    );
  return (
    <span className={`flex items-center gap-1.5 text-[12px] ${ed.hasDraft ? "text-amber-600" : "text-emerald-600"}`}>
      <Check className="h-3.5 w-3.5" /> {ed.hasDraft ? "Draft saved · not live yet" : "Live & up to date"}
    </span>
  );
}

function PagePicker() {
  const { content, pageId, setPageId, openPanel } = useApi();
  const [open, setOpen] = useState(false);
  const page = content.pages.find((p) => p.id === pageId)!;
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-[13px] font-semibold hover:bg-neutral-50">
        {page.title}
        {page.hidden && <span className="rounded bg-neutral-200 px-1 text-[10px] text-neutral-600">Hidden</span>}
        <ChevronDown className="h-4 w-4 text-neutral-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-10 z-50 w-64 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-2xl">
            {content.pages.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPageId(p.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] ${p.id === pageId ? "bg-sky-50 font-semibold text-sky-800" : "hover:bg-neutral-100"}`}
              >
                {p.title}
                <span className="text-[11px] text-neutral-400">{p.hidden ? "hidden" : `/${p.slug}`}</span>
              </button>
            ))}
            <button
              onClick={() => {
                openPanel("pages");
                setOpen(false);
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-neutral-100 px-3 py-2 text-[13px] font-semibold text-sky-700 hover:bg-sky-50"
            >
              <Plus className="h-4 w-4" /> Manage pages
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Canvas({ frameRef, device, onLoad }: { frameRef: React.RefObject<HTMLIFrameElement | null>; device: Device; onLoad: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 800 });
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const pad = device === "desktop" ? 24 : 40;
  const avail = size.w - pad * 2;
  const width = device === "desktop" ? Math.max(1280, avail) : DEVICE_WIDTH[device];
  const scale = Math.min(1, avail / width);
  const height = (size.h - pad * 2) / scale;
  return (
    <div ref={box} className="relative min-w-0 flex-1 overflow-hidden" style={{ backgroundImage: "radial-gradient(#d4d4d8 1px, transparent 1px)", backgroundSize: "18px 18px" }}>
      <div className="absolute left-1/2 overflow-hidden rounded-xl bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5" style={{ top: pad, width: width * scale, height: height * scale, transform: "translateX(-50%)" }}>
        <iframe
          ref={frameRef}
          src="/admin/preview"
          title="Site preview"
          onLoad={onLoad}
          style={{ width, height, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0, display: "block" }}
        />
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] text-neutral-500 shadow-sm ring-1 ring-black/5">
        {Math.round(width)}px · {Math.round(scale * 100)}% · click any text to edit · ⌘-click links to follow
      </div>
    </div>
  );
}

function PublishPopover({ onPublish, onClose }: { onPublish: (label: string) => Promise<void>; onClose: () => void }) {
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl">
        <div className="text-[14px] font-semibold">Publish changes</div>
        <p className="mt-1 text-[12px] text-neutral-500">Everyone will see the new version immediately. A copy of the current site is kept in History.</p>
        <input autoFocus className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-[13px] outline-none focus:border-sky-500" placeholder="What changed? (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onPublish(label);
            setBusy(false);
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2 text-[13px] font-semibold text-white hover:bg-neutral-700"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Publish now
        </button>
      </div>
    </>
  );
}

function AddSectionModal({ onPick, onClose }: { onPick: (type: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const groups = ["Intro", "Content", "Media", "Church"] as const;
  const entries = Object.entries(SECTIONS).filter(([, d]) => !q || `${d.label} ${d.description}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/40 p-6" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <Search className="h-4 w-4 text-neutral-400" />
          <input autoFocus className="flex-1 text-[14px] outline-none" placeholder="Add a section… (try “events”, “video”, “verse”)" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={onClose} className="rounded-md p-1 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {groups.map((g) => {
            const items = entries.filter(([, d]) => d.group === g);
            if (!items.length) return null;
            return (
              <div key={g} className="mb-5">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">{g}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map(([type, d]) => (
                    <button key={type} onClick={() => onPick(type)} className="rounded-xl border border-neutral-200 p-3.5 text-left transition hover:border-sky-400 hover:bg-sky-50">
                      <div className="text-[13.5px] font-semibold">{d.label}</div>
                      <div className="mt-0.5 text-[12px] leading-snug text-neutral-500">{d.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CommandPalette({ onClose, setDevice, openPublish, siteUrl }: { onClose: () => void; setDevice: (d: Device) => void; openPublish: () => void; siteUrl: string }) {
  const { content, setPageId, openPanel, openAddSection, ed, pageId, select } = useApi();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const page = content.pages.find((p) => p.id === pageId)!;
  const cmds = useMemo(() => {
    const list: { group: string; label: string; run: () => void; hint?: string }[] = [
      ...content.pages.map((p) => ({ group: "Go to page", label: p.title, hint: `/${p.slug}`, run: () => setPageId(p.id) })),
      ...RAIL.map((r) => ({ group: "Open panel", label: r.label, run: () => openPanel(r.id) })),
      ...page.sections.map((s) => ({ group: `Sections on ${page.title}`, label: `${SECTIONS[s.type]?.label}: ${String(s.props.title || s.props.eyebrow || "").slice(0, 40)}`, run: () => (openPanel("sections"), select(s.id)) })),
      { group: "Actions", label: "Add a section to this page", run: () => openAddSection(page.sections.length) },
      { group: "Actions", label: "Publish changes", run: openPublish },
      { group: "Actions", label: "Undo", hint: "⌘Z", run: ed.undo },
      { group: "Actions", label: "Redo", hint: "⇧⌘Z", run: ed.redo },
      { group: "Actions", label: "Sync new videos from YouTube", run: () => openPanel("sermons") },
      { group: "Actions", label: "Open live site", run: () => window.open(`${siteUrl}/${page.slug}`, "_blank") },
      { group: "View", label: "Desktop preview", run: () => setDevice("desktop") },
      { group: "View", label: "Tablet preview", run: () => setDevice("tablet") },
      { group: "View", label: "Mobile preview", run: () => setDevice("mobile") },
    ];
    return list;
  }, [content.pages, page, setPageId, openPanel, openAddSection, ed.undo, ed.redo, select, setDevice, openPublish, siteUrl]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = cmds.filter((c) => words.every((w) => `${c.group} ${c.label}`.toLowerCase().includes(w))).slice(0, 40);
  const run = (k: number) => {
    filtered[k]?.run();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[250] flex justify-center bg-black/30 pt-[12vh]" onClick={onClose}>
      <div className="h-fit w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Command className="h-4 w-4 text-neutral-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setI(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setI((x) => Math.min(x + 1, filtered.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setI((x) => Math.max(x - 1, 0));
              }
              if (e.key === "Enter") run(i);
            }}
            placeholder="Type a command or search…"
            className="flex-1 text-[14px] outline-none"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {filtered.map((c, k) => (
            <button key={k} onMouseEnter={() => setI(k)} onClick={() => run(k)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] ${k === i ? "bg-sky-50 text-sky-900" : ""}`}>
              <span>
                <span className="mr-2 text-[11px] text-neutral-400">{c.group}</span>
                {c.label}
              </span>
              {c.hint && <span className="text-[11px] text-neutral-400">{c.hint}</span>}
            </button>
          ))}
          {filtered.length === 0 && <div className="p-6 text-center text-[13px] text-neutral-500">No matches</div>}
        </div>
      </div>
    </div>
  );
}
