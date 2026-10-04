"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowUpRight, CheckCircle2, ChevronRight, Copy, Eye, EyeOff, FileText, Info, Loader2, Plus, RotateCcw, Trash2, X,
} from "lucide-react";
import type { ChurchEvent, ConnectForm, Page, SiteContent } from "@/lib/types";
import { SECTIONS } from "@/components/site/registry";
import { Icon } from "@/components/site/icons";
import { THEME_PRESETS } from "@/lib/seed";
import { BODY_FONTS, DISPLAY_FONTS } from "@/lib/theme";
import { formatDate, setPath, sortedSermons, todayISO, uid, whatsappLink } from "@/lib/util";
import { LANGS } from "@/lib/i18n";
import { collectStrings } from "@/lib/translatable";
import { useApi, type PanelId } from "./api";
import { FieldsForm, IconInput, ImageInput, Label, Section, SortableList, Text, Toggle, UrlInput, inputCls } from "./fields";
import { sectionAction, setTranslation, updatePage, updateSectionProp } from "./useEditor";

export function PanelHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3.5">
      <div>
        <div className="text-[14px] font-semibold text-neutral-900">{title}</div>
        {sub && <div className="mt-0.5 text-[12px] leading-snug text-neutral-500">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// ---------------- Sections (left) ----------------

export function SectionsPanel() {
  const { content, ed, pageId, selectedId, select, openAddSection } = useApi();
  const page = content.pages.find((p) => p.id === pageId)!;
  return (
    <div>
      <PanelHeader title={page.title} sub={page.hidden ? "Hidden page — not visible on the live site" : `/${page.slug}`} />
      <button onClick={() => select("__header")} className={`flex w-full items-center gap-2 border-b border-neutral-100 px-4 py-2.5 text-left text-[13px] hover:bg-neutral-50 ${selectedId === "__header" ? "bg-sky-50 text-sky-800" : "text-neutral-600"}`}>
        <FileText className="h-4 w-4" /> Header & announcement
      </button>
      <div className="p-2">
        <SortableList
          items={page.sections}
          getId={(s) => s.id}
          onReorder={(sections) => ed.commit((c) => updatePage(c, pageId, (p) => ({ ...p, sections })))}
          render={(s, i, handle) => (
            <div
              className={`group mb-0.5 flex items-center gap-1.5 rounded-lg px-1.5 py-2 ${selectedId === s.id ? "bg-sky-50 ring-1 ring-sky-200" : "hover:bg-neutral-100"}`}
            >
              {handle}
              <button onClick={() => select(s.id)} className={`min-w-0 flex-1 text-left ${s.hidden ? "text-neutral-400 line-through" : ""}`}>
                <div className="truncate text-[13px] font-medium">{SECTIONS[s.type]?.label || s.type}</div>
                <div className="truncate text-[11px] text-neutral-500">{String(s.props.title || s.props.eyebrow || s.props.text || "").slice(0, 60) || " "}</div>
              </button>
              <button
                title={s.hidden ? "Show" : "Hide"}
                onClick={() => ed.commit((c) => sectionAction(c, pageId, s.id, "hide").content)}
                className={`rounded p-1 text-neutral-400 hover:bg-white hover:text-neutral-800 ${s.hidden ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                {s.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button title="Add section below" onClick={() => openAddSection(i + 1)} className="rounded p-1 text-neutral-400 opacity-0 hover:bg-white hover:text-sky-700 group-hover:opacity-100">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        />
        <button onClick={() => openAddSection(page.sections.length)} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-sky-700 hover:bg-sky-50">
          <Plus className="h-4 w-4" /> Add section
        </button>
      </div>
      <button onClick={() => select("__footer")} className={`flex w-full items-center gap-2 border-t border-neutral-100 px-4 py-2.5 text-left text-[13px] hover:bg-neutral-50 ${selectedId === "__footer" ? "bg-sky-50 text-sky-800" : "text-neutral-600"}`}>
        <FileText className="h-4 w-4" /> Footer
      </button>
    </div>
  );
}

// ---------------- Inspector (right) ----------------

export function Inspector() {
  const { content, ed, pageId, selectedId, select, focusField, openPanel, editLang } = useApi();
  if (selectedId === "__header" || selectedId === "__footer") return <ChromeInspector which={selectedId} />;
  const page = content.pages.find((p) => p.id === pageId);
  const section = page?.sections.find((s) => s.id === selectedId);
  if (!section) return null;
  const def = SECTIONS[section.type];
  const values = { ...def.defaults, ...section.props };
  const act = (a: "duplicate" | "hide" | "delete") => {
    if (a === "delete" && !confirm(`Delete the "${def.label}" section? You can undo with ⌘Z.`)) return;
    const r = sectionAction(content, pageId, section.id, a);
    ed.commit(() => r.content);
    if (a === "delete") select(undefined);
    if (r.select) select(r.select);
  };
  return (
    <div>
      <PanelHeader
        title={def.label}
        sub={def.description}
        right={
          <button onClick={() => select(undefined)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        }
      />
      {editLang !== "en" && (
        <div className="mx-4 mt-4 rounded-lg bg-violet-50 p-3 text-[12px] leading-snug text-violet-900">
          You&apos;re viewing <b>{LANGS.find((l) => l.code === editLang)?.label}</b>. Click text on the page to edit it in this language, or use the{" "}
          <button className="font-semibold underline" onClick={() => openPanel("translations")}>
            Translations
          </button>{" "}
          panel. Settings below are shared by all languages.
        </div>
      )}
      {def.dataPanel && (
        <button onClick={() => openPanel(def.dataPanel!.panel as PanelId)} className="mx-4 mt-4 flex w-[calc(100%-2rem)] items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-[13px] font-semibold text-sky-800 hover:bg-sky-100">
          {def.dataPanel.label} <ChevronRight className="h-4 w-4" />
        </button>
      )}
      <div className="p-4">
        <FieldsForm
          fields={def.fields}
          values={values}
          content={content}
          focusField={focusField}
          onChange={(k, v) => ed.commit((c) => updateSectionProp(c, pageId, section.id, k, v), `${section.id}.${k}`)}
        />
      </div>
      <div className="flex gap-2 border-t border-neutral-200 p-4">
        <button onClick={() => act("duplicate")} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 py-2 text-[12px] font-semibold hover:bg-neutral-50">
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </button>
        <button onClick={() => act("hide")} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 py-2 text-[12px] font-semibold hover:bg-neutral-50">
          {section.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {section.hidden ? "Show" : "Hide"}
        </button>
        <button onClick={() => act("delete")} className="flex items-center justify-center rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50" title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function useGlobal() {
  const { ed } = useApi();
  return (path: string, value: unknown) => ed.commit((c) => setPath(c, path, value), path);
}

function ChromeInspector({ which }: { which: string }) {
  const { content, select, openPanel } = useApi();
  const set = useGlobal();
  const s = content.settings;
  return (
    <div>
      <PanelHeader
        title={which === "__header" ? "Header" : "Footer"}
        sub="Shared by every page"
        right={
          <button onClick={() => select(undefined)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        }
      />
      <div className="space-y-4 p-4">
        {which === "__header" ? (
          <>
            <Toggle checked={s.announcement.enabled} onChange={(v) => set("settings.announcement.enabled", v)} label="Announcement bar" help="Thin bar above the menu" />
            <div>
              <Label>Announcement text</Label>
              <Text value={s.announcement.text} onChange={(v) => set("settings.announcement.text", v)} multiline rows={2} />
            </div>
            <div>
              <Label>Announcement link</Label>
              <UrlInput value={s.announcement.href} onChange={(v) => set("settings.announcement.href", v)} content={content} />
            </div>
            <button onClick={() => openPanel("pages")} className="flex w-full items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-[13px] font-semibold text-sky-800 hover:bg-sky-100">
              Edit menu (pages & order) <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div>
              <Label>Footer text</Label>
              <Text value={s.footerBlurb} onChange={(v) => set("settings.footerBlurb", v)} multiline />
            </div>
            <button onClick={() => openPanel("settings")} className="flex w-full items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-[13px] font-semibold text-sky-800 hover:bg-sky-100">
              Contact, address & social links <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------- Pages ----------------

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function PagesPanel() {
  const { content, ed, pageId, setPageId } = useApi();
  const page = content.pages.find((p) => p.id === pageId)!;
  const [adding, setAdding] = useState("");
  const upd = (fn: (p: Page) => Page, key?: string) => ed.commit((c) => updatePage(c, pageId, fn), key);
  const home = content.pages.find((p) => !p.slug);
  const rest = content.pages.filter((p) => p.slug);

  const addPage = () => {
    const title = adding.trim();
    if (!title) return;
    let slug = slugify(title) || "page";
    while (content.pages.some((p) => p.slug === slug)) slug += "-2";
    const p: Page = {
      id: uid("p"),
      slug,
      title,
      navLabel: title,
      showInNav: false,
      hidden: true,
      sections: [{ id: uid("s"), type: "pageHeader", props: { ...structuredClone(SECTIONS.pageHeader.defaults), title, eyebrow: "", subtitle: "" } }],
    };
    ed.commit((c) => ({ ...c, pages: [...c.pages, p] }));
    setPageId(p.id);
    setAdding("");
  };

  return (
    <div>
      <PanelHeader title="Pages & menu" sub="Drag to reorder the menu. New pages start hidden until you're ready." />
      <div className="p-2">
        {home && (
          <button onClick={() => setPageId(home.id)} className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium ${pageId === home.id ? "bg-sky-50 ring-1 ring-sky-200" : "hover:bg-neutral-100"}`}>
            Home <span className="ml-auto text-[11px] text-neutral-400">/</span>
          </button>
        )}
        <SortableList
          items={rest}
          getId={(p) => p.id}
          onReorder={(items) => ed.commit((c) => ({ ...c, pages: [...c.pages.filter((p) => !p.slug), ...items] }))}
          render={(p, _i, handle) => (
            <div className={`mb-0.5 flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 ${pageId === p.id ? "bg-sky-50 ring-1 ring-sky-200" : "hover:bg-neutral-100"}`}>
              {handle}
              <button onClick={() => setPageId(p.id)} className={`min-w-0 flex-1 truncate text-left text-[13px] font-medium ${p.hidden ? "text-neutral-400" : ""}`}>
                {p.title}
              </button>
              {p.hidden && <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">Hidden</span>}
              {!p.hidden && p.showInNav && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Menu</span>}
            </div>
          )}
        />
        <div className="mt-2 flex gap-2 px-1">
          <input className={inputCls} placeholder="New page title" value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPage()} />
          <button onClick={addPage} className="shrink-0 rounded-lg bg-neutral-900 px-3 text-[12px] font-semibold text-white">
            Add
          </button>
        </div>
      </div>

      <Section title={`Page settings — ${page.title}`}>
        <div className="space-y-4">
          <div>
            <Label>Page title</Label>
            <Text value={page.title} onChange={(v) => upd((p) => ({ ...p, title: v }), "title")} />
          </div>
          {page.slug !== "" && (
            <>
              <div>
                <Label help="Lowercase words with dashes">URL</Label>
                <div className="flex items-center gap-1 text-[13px]">
                  <span className="text-neutral-400">/</span>
                  <Text value={page.slug} onChange={(v) => upd((p) => ({ ...p, slug: slugify(v) || p.slug }), "slug")} />
                </div>
              </div>
              <div>
                <Label>Menu label</Label>
                <Text value={page.navLabel || ""} onChange={(v) => upd((p) => ({ ...p, navLabel: v }), "nav")} placeholder={page.title} />
              </div>
              <Toggle checked={!page.hidden} onChange={(v) => upd((p) => ({ ...p, hidden: !v }))} label="Visible on the live site" help={page.hidden ? "Visitors get a 404 for this page" : undefined} />
              <Toggle checked={page.showInNav} onChange={(v) => upd((p) => ({ ...p, showInNav: v }))} label="Show in menu" />
            </>
          )}
        </div>
      </Section>
      <Section title="Search engine listing">
        <div className="space-y-3">
          <div className="rounded-lg border bg-white p-3">
            <div className="truncate text-[12px] text-emerald-700">paralokanestham.org/{page.slug}</div>
            <div className="truncate text-[15px] text-[#1a0dab]">{page.seoTitle || (page.slug ? `${page.title} | ${content.settings.churchName}` : content.settings.churchName)}</div>
            <div className="line-clamp-2 text-[12px] text-neutral-600">{page.seoDescription || content.settings.footerBlurb}</div>
          </div>
          <div>
            <Label>SEO title</Label>
            <Text value={page.seoTitle || ""} onChange={(v) => upd((p) => ({ ...p, seoTitle: v }), "seoT")} placeholder="Auto from page title" />
          </div>
          <div>
            <Label right={<span className={`text-[11px] ${(page.seoDescription || "").length > 160 ? "text-amber-600" : "text-neutral-400"}`}>{(page.seoDescription || "").length}/160</span>}>SEO description</Label>
            <Text value={page.seoDescription || ""} onChange={(v) => upd((p) => ({ ...p, seoDescription: v }), "seoD")} multiline rows={3} />
          </div>
        </div>
      </Section>
      {page.slug !== "" && (
        <div className="p-4">
          <button
            onClick={() => {
              if (!confirm(`Delete the page "${page.title}"? You can undo with ⌘Z.`)) return;
              ed.commit((c) => ({ ...c, pages: c.pages.filter((p) => p.id !== page.id) }));
              setPageId(home?.id || content.pages[0].id);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete page
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------- Church info ----------------

export function SettingsPanel() {
  const { content, ed } = useApi();
  const s = content.settings;
  const set = useGlobal();
  const f = (label: string, path: string, opts: { multiline?: boolean; help?: string; placeholder?: string } = {}) => (
    <div>
      <Label help={opts.help}>{label}</Label>
      <Text value={path.split(".").reduce((o: any, k) => o?.[k], content) ?? ""} onChange={(v) => set(path, v)} multiline={opts.multiline} placeholder={opts.placeholder} /> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
    </div>
  );
  return (
    <div>
      <PanelHeader title="Church info" sub="Used across the whole site — change once, updates everywhere." />
      <Section title="Service times">
        <div className="space-y-2">
          <div>
            <Label>Day</Label>
            <Text value={s.serviceDay} onChange={(v) => set("settings.serviceDay", v)} />
          </div>
          {s.serviceTimes.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={inputCls} value={t.label} onChange={(e) => set(`settings.serviceTimes.${i}.label`, e.target.value)} />
              <input className={`${inputCls} w-28`} value={t.time} placeholder="8:30 AM" onChange={(e) => set(`settings.serviceTimes.${i}.time`, e.target.value)} />
              <button onClick={() => ed.commit((c) => setPath(c, "settings.serviceTimes", c.settings.serviceTimes.filter((_, j) => j !== i)))} className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => ed.commit((c) => setPath(c, "settings.serviceTimes", [...c.settings.serviceTimes, { label: `${c.settings.serviceTimes.length + 1}th Service`, time: "6:00 PM" }]))}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-sky-700"
          >
            <Plus className="h-3.5 w-3.5" /> Add service
          </button>
          <p className="text-[11px] text-neutral-500">The live countdown on the Sermons page uses these times (IST).</p>
        </div>
      </Section>
      <Section title="Contact & location">
        <div className="space-y-3">
          {f("Phone", "settings.phone")}
          {f("Email", "settings.email")}
          {f("Address", "settings.address", { multiline: true })}
          {f("Map search", "settings.mapQuery", { help: "What Google Maps should search for" })}
        </div>
      </Section>
      <Section title="Names & tagline" defaultOpen={false}>
        <div className="space-y-3">
          {f("Church name", "settings.churchName")}
          {f("Short name (logo)", "settings.shortName")}
          {f("Telugu name", "settings.teluguName")}
          {f("Tagline", "settings.tagline")}
          <div>
            <Label>Emblem (logo icon)</Label>
            <ImageInput value={s.emblem} onChange={(v) => set("settings.emblem", v)} />
          </div>
        </div>
      </Section>
      <Section title="Social links" defaultOpen={false}>
        <div className="space-y-3">
          {f("YouTube", "settings.socials.youtube")}
          {f("Instagram", "settings.socials.instagram")}
          {f("Facebook", "settings.socials.facebook")}
          {f("X / Twitter", "settings.socials.x")}
          {f("WhatsApp channel", "settings.socials.whatsappChannel")}
          {f("YouTube channel ID", "settings.youtubeChannelId", { help: "Used for live detection and 'Sync from YouTube'" })}
        </div>
      </Section>
    </div>
  );
}

// ---------------- Theme ----------------

export function ThemePanel() {
  const { content, ed } = useApi();
  const t = content.theme;
  const set = useGlobal();
  const colorLabels: Record<keyof typeof t.colors, string> = { bg: "Background", surface: "Cards", text: "Text", muted: "Soft text", primary: "Primary (buttons)", accent: "Accent (gold)", glow: "Stage glow" };
  return (
    <div>
      <PanelHeader title="Theme" sub="Colours and fonts update live." />
      <Section title="Presets">
        <div className="grid gap-2">
          {Object.entries(THEME_PRESETS).map(([id, p]) => (
            <button
              key={id}
              onClick={() => ed.commit((c) => ({ ...c, theme: { ...c.theme, preset: id, colors: { ...p.colors } } }))}
              className={`flex items-center gap-3 rounded-lg border p-2.5 text-left text-[13px] font-medium ${t.preset === id ? "border-sky-500 ring-2 ring-sky-500/20" : "border-neutral-200 hover:border-neutral-400"}`}
            >
              <span className="flex overflow-hidden rounded-md border">
                {[p.colors.bg, p.colors.primary, p.colors.accent, p.colors.glow].map((c) => (
                  <span key={c} className="h-7 w-5" style={{ background: c }} />
                ))}
              </span>
              {p.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Colours">
        <div className="space-y-2">
          {(Object.keys(t.colors) as (keyof typeof t.colors)[]).map((k) => (
            <label key={k} className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-neutral-700">{colorLabels[k]}</span>
              <span className="flex items-center gap-2">
                <input className="w-20 rounded-md border border-neutral-300 px-2 py-1 font-mono text-[12px]" value={t.colors[k]} onChange={(e) => set(`theme.colors.${k}`, e.target.value)} />
                <input type="color" value={t.colors[k]} onChange={(e) => set(`theme.colors.${k}`, e.target.value)} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
              </span>
            </label>
          ))}
        </div>
      </Section>
      <Section title="Typography & shape">
        <div className="space-y-4">
          <div>
            <Label>Heading font</Label>
            <select className={inputCls} value={t.displayFont} onChange={(e) => set("theme.displayFont", e.target.value)}>
              {Object.entries(DISPLAY_FONTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Body font</Label>
            <select className={inputCls} value={t.bodyFont} onChange={(e) => set("theme.bodyFont", e.target.value)}>
              {Object.entries(BODY_FONTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <Toggle checked={t.uppercaseHeadings} onChange={(v) => set("theme.uppercaseHeadings", v)} label="UPPERCASE headings" />
          <div>
            <Label>Corner roundness</Label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={32} value={t.radius} onChange={(e) => set("theme.radius", Number(e.target.value))} className="flex-1 accent-sky-500" />
              <span className="w-10 text-right text-[12px] tabular-nums">{t.radius}px</span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ---------------- Giving ----------------

export function GivingPanel() {
  const { content } = useApi();
  const g = content.settings.giving;
  const set = useGlobal();
  return (
    <div>
      <PanelHeader title="Giving (UPI)" sub="Visitors tap PhonePe, Google Pay or Paytm to open that app with your UPI ID filled in, or scan the QR." />
      <Section title="UPI">
        <div className="space-y-3">
          <div>
            <Label help="e.g. paralokanestham@okhdfcbank. A QR code is generated from it automatically.">UPI ID</Label>
            <Text value={g.upiId} onChange={(v) => set("settings.giving.upiId", v.trim())} placeholder="name@bank" />
          </div>
          <div>
            <Label help="Shown in the payment app">Payee name</Label>
            <Text value={g.payeeName} onChange={(v) => set("settings.giving.payeeName", v)} />
          </div>
          {g.upiId && !/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(g.upiId) && (
            <div className="flex gap-2 rounded-lg bg-amber-50 p-2.5 text-[12px] text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" /> That doesn&apos;t look like a UPI ID (name@bank).
            </div>
          )}
          <p className="text-[11px] leading-snug text-neutral-500">Tip: a business/merchant UPI ID works most reliably with app buttons. Test once on your phone after adding it.</p>
        </div>
      </Section>
      <Section title="QR code image (optional)">
        <Label help="Upload the QR from your bank or UPI app to use it instead of the generated one">QR image</Label>
        <ImageInput value={g.qrImage} onChange={(v) => set("settings.giving.qrImage", v)} />
      </Section>
      <Section title="Note under the details">
        <Text value={g.note} onChange={(v) => set("settings.giving.note", v)} multiline />
      </Section>
    </div>
  );
}

// ---------------- Connect ----------------

export function ConnectPanel() {
  const { content, ed } = useApi();
  const s = content.settings;
  const set = useGlobal();
  const [open, setOpen] = useState<string | null>(null);
  const digits = s.whatsapp.replace(/\D/g, "");
  const updForm = (id: string, patch: Partial<ConnectForm>) =>
    ed.commit((c) => setPath(c, "settings.connectForms", c.settings.connectForms.map((f) => (f.id === id ? { ...f, ...patch } : f))), `form.${id}.${Object.keys(patch)[0]}`);
  return (
    <div>
      <PanelHeader title="Get connected" sub="Each option opens a short form, then continues in WhatsApp with a pre-filled message." />
      <Section title="WhatsApp number">
        <div className="space-y-2">
          <Text value={s.whatsapp} onChange={(v) => set("settings.whatsapp", v)} placeholder="+91 98765 43210" />
          {!digits ? (
            <div className="flex gap-2 rounded-lg bg-amber-50 p-2.5 text-[12px] text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Not set yet — visitors will see a &quot;call us&quot; message instead.
            </div>
          ) : digits.length < 11 ? (
            <div className="rounded-lg bg-amber-50 p-2.5 text-[12px] text-amber-800">Include the country code, e.g. +91.</div>
          ) : (
            <a href={whatsappLink(s.whatsapp, "Test message from the church website ✅")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
              Send a test message <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </Section>
      <Section title="Options">
        <SortableList
          items={s.connectForms}
          getId={(f) => f.id}
          onReorder={(items) => ed.commit((c) => setPath(c, "settings.connectForms", items))}
          render={(f, _i, handle) => (
            <div className="mb-2 rounded-lg border border-neutral-200 bg-white">
              <div className="flex items-center gap-2 px-2 py-2">
                {handle}
                <Icon name={f.icon} className="h-4 w-4 text-neutral-500" />
                <button onClick={() => setOpen(open === f.id ? null : f.id)} className="flex-1 truncate text-left text-[13px] font-medium">
                  {f.title}
                </button>
                <button
                  onClick={() => confirm(`Remove "${f.title}"?`) && ed.commit((c) => setPath(c, "settings.connectForms", c.settings.connectForms.filter((x) => x.id !== f.id)))}
                  className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {open === f.id && (
                <div className="space-y-3 border-t p-3">
                  <div>
                    <Label>Title</Label>
                    <Text value={f.title} onChange={(v) => updForm(f.id, { title: v })} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Text value={f.text} onChange={(v) => updForm(f.id, { text: v })} multiline rows={3} />
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <IconInput value={f.icon} onChange={(v) => updForm(f.id, { icon: v })} />
                  </div>
                  <div>
                    <Label>Button text</Label>
                    <Text value={f.buttonLabel} onChange={(v) => updForm(f.id, { buttonLabel: v })} />
                  </div>
                  <Toggle checked={f.askMessage} onChange={(v) => updForm(f.id, { askMessage: v })} label="Ask for a message" />
                  {f.askMessage && (
                    <div>
                      <Label>Message prompt</Label>
                      <Text value={f.messageLabel || ""} onChange={(v) => updForm(f.id, { messageLabel: v })} />
                    </div>
                  )}
                  <div>
                    <Label help="Comma separated, e.g. Area / Locality, Age">Extra fields</Label>
                    <Text value={(f.extraFields || []).join(", ")} onChange={(v) => updForm(f.id, { extraFields: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
                  </div>
                  <div>
                    <Label help="First line of the WhatsApp message, so you can tell requests apart">WhatsApp heading</Label>
                    <Text value={f.whatsappIntro} onChange={(v) => updForm(f.id, { whatsappIntro: v })} />
                  </div>
                </div>
              )}
            </div>
          )}
        />
        <button
          onClick={() => {
            const id = uid("f");
            ed.commit((c) =>
              setPath(c, "settings.connectForms", [
                ...c.settings.connectForms,
                { id, title: "New option", text: "Describe this next step.", icon: "Sparkles", buttonLabel: "Sign up", askMessage: false, extraFields: [], whatsappIntro: "📝 Sign-up" },
              ]),
            );
            setOpen(id);
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 py-2 text-[12px] font-semibold text-sky-700 hover:border-sky-500 hover:bg-sky-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add option
        </button>
      </Section>
    </div>
  );
}

// ---------------- Events ----------------

export function EventsPanel() {
  const { content, ed } = useApi();
  const [open, setOpen] = useState<string | null>(null);
  const today = todayISO();
  const events = [...content.events].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const upd = (id: string, patch: Partial<ChurchEvent>) => ed.commit((c) => ({ ...c, events: c.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }), `ev.${id}.${Object.keys(patch)[0]}`);
  return (
    <div>
      <PanelHeader title="Events" sub="Past events hide from the site automatically the day after they end." />
      <div className="p-3">
        <button
          onClick={() => {
            const e: ChurchEvent = { id: uid("e"), title: "New event", startDate: today, time: "Timings will be updated soon", location: "NKNR Gardens, Kukatpally", description: "", tag: "" };
            ed.commit((c) => ({ ...c, events: [...c.events, e] }));
            setOpen(e.id);
          }}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 py-2.5 text-[13px] font-semibold text-white hover:bg-neutral-700"
        >
          <Plus className="h-4 w-4" /> New event
        </button>
        {events.map((e) => {
          const past = (e.endDate || e.startDate) < today;
          return (
            <div key={e.id} className={`mb-2 rounded-lg border ${open === e.id ? "border-sky-300" : "border-neutral-200"} bg-white`}>
              <button onClick={() => setOpen(open === e.id ? null : e.id)} className="flex w-full items-center gap-3 p-2.5 text-left">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-neutral-100 text-center leading-none">
                  <div>
                    <div className="text-[15px] font-bold">{e.startDate.slice(8, 10)}</div>
                    <div className="text-[9px] font-semibold uppercase text-neutral-500">{formatDate(e.startDate, { month: "short" })}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-[13px] font-semibold ${e.hidden || past ? "text-neutral-400" : ""}`}>{e.title}</div>
                  <div className="truncate text-[11px] text-neutral-500">{e.time}</div>
                </div>
                {past && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">Past</span>}
                {e.hidden && <EyeOff className="h-3.5 w-3.5 text-neutral-400" />}
              </button>
              {open === e.id && (
                <div className="space-y-3 border-t p-3">
                  <div>
                    <Label>Title</Label>
                    <Text value={e.title} onChange={(v) => upd(e.id, { title: v })} />
                  </div>
                  <div>
                    <Label>Subtitle</Label>
                    <Text value={e.subtitle || ""} onChange={(v) => upd(e.id, { subtitle: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Date</Label>
                      <input type="date" className={inputCls} value={e.startDate} onChange={(x) => upd(e.id, { startDate: x.target.value })} />
                    </div>
                    <div>
                      <Label>End date</Label>
                      <input type="date" className={inputCls} value={e.endDate || ""} onChange={(x) => upd(e.id, { endDate: x.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label right={<button className="text-[11px] font-semibold text-sky-700" onClick={() => upd(e.id, { time: "Timings will be updated soon" })}>Set &quot;update soon&quot;</button>}>Time</Label>
                    <Text value={e.time} onChange={(v) => upd(e.id, { time: v })} placeholder="6:00 AM, 8:30 AM & 11:00 AM" />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Text value={e.location} onChange={(v) => upd(e.id, { location: v })} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Text value={e.description} onChange={(v) => upd(e.id, { description: v })} multiline />
                  </div>
                  <div>
                    <Label>Tag</Label>
                    <Text value={e.tag || ""} onChange={(v) => upd(e.id, { tag: v })} placeholder="Christmas" />
                  </div>
                  <div>
                    <Label help="Leave empty for the automatic date artwork">Image</Label>
                    <ImageInput value={e.image || ""} onChange={(v) => upd(e.id, { image: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Button text</Label>
                      <Text value={e.ctaLabel || ""} onChange={(v) => upd(e.id, { ctaLabel: v })} />
                    </div>
                    <div>
                      <Label>Button link</Label>
                      <UrlInput value={e.ctaHref || ""} onChange={(v) => upd(e.id, { ctaHref: v })} content={content} />
                    </div>
                  </div>
                  <Toggle checked={!e.hidden} onChange={(v) => upd(e.id, { hidden: !v })} label="Visible on site" />
                  <button
                    onClick={() => confirm(`Delete "${e.title}"?`) && ed.commit((c) => ({ ...c, events: c.events.filter((x) => x.id !== e.id) }))}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete event
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- History ----------------

export function HistoryPanel() {
  const { ed, toast } = useApi();
  const [revs, setRevs] = useState<{ id: string; label: string; publishedAt: string }[] | null>(null);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    fetch("/api/admin/revisions").then((r) => r.json()).then((d) => setRevs(d.revisions || []));
  }, [ed.hasDraft]);
  const restore = async (id: string) => {
    if (!confirm("Load this version into the editor? It won't go live until you publish.")) return;
    setBusy(id);
    const r = await fetch("/api/admin/revisions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const d = await r.json();
    setBusy("");
    if (r.ok) {
      ed.reset(d.content, true);
      toast("Version restored to the editor — publish to make it live");
    } else toast(d.error, "err");
  };
  return (
    <div>
      <PanelHeader title="Version history" sub="Every publish is saved. Restore any version with one click." />
      <div className="p-3">
        {ed.hasDraft && (
          <button
            onClick={async () => {
              if (!confirm("Throw away all unpublished changes and go back to the live site?")) return;
              const r = await fetch("/api/admin/discard", { method: "POST" });
              const d = await r.json();
              ed.reset(d.content, false);
              toast("Unpublished changes discarded");
            }}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 py-2 text-[12px] font-semibold hover:bg-neutral-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Discard unpublished changes
          </button>
        )}
        {!revs && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-neutral-400" />}
        {revs?.length === 0 && <div className="p-4 text-center text-[13px] text-neutral-500">No published versions yet.</div>}
        {revs?.map((r, i) => (
          <div key={r.id} className="mb-1 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50">
            <div className={`h-2 w-2 shrink-0 rounded-full ${i === 0 ? "bg-emerald-500" : "bg-neutral-300"}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{r.label || (i === 0 ? "Current live version" : "Published")}</div>
              <div className="text-[11px] text-neutral-500">{new Date(r.publishedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
            </div>
            <button onClick={() => restore(r.id)} className="rounded-md border px-2 py-1 text-[11px] font-semibold hover:bg-white">
              {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Restore"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Site health ----------------

export type Issue = { level: "warn" | "info"; text: string; fix: () => void; fixLabel: string };

type IssueNav = { openPanel: (p: PanelId) => void; setPageId: (id: string) => void; select: (id?: string) => void };

export function useIssues(content: SiteContent, { openPanel, setPageId, select }: IssueNav): Issue[] {
  return useMemo(() => {
    const out: Issue[] = [];
    const s = content.settings;
    const g = s.giving;
    if (!s.whatsapp.replace(/\D/g, "")) out.push({ level: "warn", text: "WhatsApp number isn't set — Get Connected forms can't send yet.", fix: () => openPanel("connect"), fixLabel: "Add number" });
    if (!g.upiId) out.push({ level: "warn", text: "UPI ID isn't set. The PhonePe / Google Pay / Paytm buttons need it.", fix: () => openPanel("giving"), fixLabel: "Add" });
    const today = todayISO();
    content.events
      .filter((e) => !e.hidden && e.startDate >= today && /soon/i.test(e.time))
      .forEach((e) => out.push({ level: "info", text: `“${e.title}” timings still say “updated soon”.`, fix: () => openPanel("events"), fixLabel: "Update" }));
    const latest = sortedSermons(content)[0];
    if (latest?.date) {
      const days = Math.round((new Date(today).getTime() - new Date(latest.date).getTime()) / 86400000);
      if (days > 10) out.push({ level: "info", text: `Newest sermon is ${days} days old.`, fix: () => openPanel("sermons"), fixLabel: "Sync YouTube" });
    }
    content.pages
      .filter((p) => !p.hidden && !p.seoDescription)
      .forEach((p) => out.push({ level: "info", text: `“${p.title}” has no search description.`, fix: () => (setPageId(p.id), openPanel("pages")), fixLabel: "Add" }));
    content.pages.forEach((p) =>
      p.sections.forEach((sec) => {
        if (sec.hidden) return;
        const imgs = JSON.stringify(sec.props).match(/"image":""/g);
        if (imgs && ["leaders", "splitFeature"].includes(sec.type)) out.push({ level: "info", text: `A ${SECTIONS[sec.type].label} block on “${p.title}” is missing a photo.`, fix: () => (setPageId(p.id), select(sec.id)), fixLabel: "Fix" });
      }),
    );
    if (s.announcement.enabled && s.announcement.href.startsWith("/")) {
      const target = content.pages.find((p) => `/${p.slug}` === s.announcement.href.split(/[?#]/)[0]);
      if (target?.hidden) out.push({ level: "warn", text: "The announcement bar links to a hidden page.", fix: () => select("__header"), fixLabel: "Fix" });
    }
    return out;
  }, [content, openPanel, setPageId, select]);
}

export function HealthPanel() {
  const api = useApi();
  const { content } = api;
  const issues = useIssues(content, api);
  const hiddenPages = content.pages.filter((p) => p.hidden);
  return (
    <div>
      <PanelHeader title="Site health" sub="Things worth finishing before (and after) launch." />
      <div className="space-y-2 p-3">
        {issues.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-[13px] text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Everything looks great!
          </div>
        )}
        {issues.map((i, k) => (
          <div key={k} className={`flex items-start gap-2.5 rounded-lg p-3 text-[12.5px] ${i.level === "warn" ? "bg-amber-50 text-amber-900" : "bg-neutral-50 text-neutral-700"}`}>
            {i.level === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />}
            <span className="flex-1 leading-snug">{i.text}</span>
            <button onClick={i.fix} className="shrink-0 rounded-md bg-white px-2 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-black/5 hover:bg-neutral-50">
              {i.fixLabel}
            </button>
          </div>
        ))}
        {hiddenPages.length > 0 && (
          <div className="pt-3 text-[12px] text-neutral-500">
            Hidden pages: {hiddenPages.map((p) => p.title).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Translations ----------------

export function TranslationsPanel() {
  const { content, ed, editLang, setEditLang } = useApi();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [missing, setMissing] = useState(false);
  const all = useMemo(() => collectStrings(content), [content]);
  const groups = [...new Set(all.map((x) => x.group))];
  const tr = content.translations || { te: {}, hi: {} };
  const count = (l: "te" | "hi") => all.filter((x) => tr[l]?.[x.key]).length;
  const list = all.filter(
    (x) =>
      (group === "all" || x.group === group) &&
      (!q || `${x.en} ${tr.te?.[x.key] || ""} ${tr.hi?.[x.key] || ""}`.toLowerCase().includes(q.toLowerCase())) &&
      (!missing || !tr.te?.[x.key] || !tr.hi?.[x.key]),
  );
  const field = (l: "te" | "hi", key: string, long?: boolean) => {
    const v = tr[l]?.[key] || "";
    const cls = `${inputCls} ${v ? "" : "border-amber-300 bg-amber-50/50"}`;
    const onChange = (val: string) => ed.commit((c) => setTranslation(c, l, key, val), `tr.${l}.${key}`);
    return long ? <textarea rows={3} className={`${cls} resize-y`} value={v} placeholder="Not translated (English shows)" onChange={(e) => onChange(e.target.value)} lang={l} /> : <input className={cls} value={v} placeholder="Not translated (English shows)" onChange={(e) => onChange(e.target.value)} lang={l} />;
  };
  return (
    <div>
      <PanelHeader title="Translations" sub={`Telugu ${count("te")}/${all.length} · Hindi ${count("hi")}/${all.length}. Empty = English is shown.`} />
      <div className="sticky top-0 z-10 space-y-2 border-b border-neutral-200 bg-white p-3">
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-0.5">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => setEditLang(l.code)} className={`flex-1 rounded-md py-1.5 text-[12px] font-semibold ${editLang === l.code ? "bg-white text-sky-700 shadow-sm" : "text-neutral-500"}`}>
              Preview {l.label}
            </button>
          ))}
        </div>
        <input className={inputCls} placeholder="Search text…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-2">
          <select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">Everything</option>
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <label className="flex shrink-0 items-center gap-1.5 text-[12px] text-neutral-600">
            <input type="checkbox" checked={missing} onChange={(e) => setMissing(e.target.checked)} className="accent-sky-600" /> Missing only
          </label>
        </div>
      </div>
      <div className="divide-y divide-neutral-100">
        {list.map((x) => (
          <div key={x.key} className="space-y-1.5 p-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">
              {x.group} · {x.label}
            </div>
            <div className="text-[12.5px] leading-snug text-neutral-800">{x.en}</div>
            <div className="grid gap-1.5">
              <div className="flex items-start gap-2">
                <span className="mt-2 w-7 shrink-0 text-[11px] font-bold text-neutral-400">తె</span>
                {field("te", x.key, x.long)}
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-2 w-7 shrink-0 text-[11px] font-bold text-neutral-400">हि</span>
                {field("hi", x.key, x.long)}
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="p-6 text-center text-[13px] text-neutral-500">Nothing here.</div>}
      </div>
    </div>
  );
}

// ---------------- Account ----------------

export function AccountPanel() {
  const { toast } = useApi();
  const [info, setInfo] = useState<{ username: string; usingDefault: boolean } | null>(null);
  const [username, setUsername] = useState("");
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch("/api/admin/account")
      .then((r) => r.json())
      .then((d) => {
        setInfo(d);
        setUsername(d.username || "");
      });
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (pw && pw !== pw2) return setErr("The new passwords don't match");
    setBusy(true);
    const r = await fetch("/api/admin/account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, username, password: pw || undefined }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(d.error || "Couldn't save");
    setInfo({ username: d.username, usingDefault: false });
    setCurrent("");
    setPw("");
    setPw2("");
    toast("Login updated. Other devices have been signed out.");
  };
  const strength = pw.length === 0 ? "" : pw.length < 8 ? "Too short" : /[A-Z]/.test(pw) && /\d/.test(pw) && pw.length >= 10 ? "Strong" : "OK";
  return (
    <div>
      <PanelHeader title="Account & login" sub="Change the login ID and password used to open this editor." />
      {info?.usingDefault && (
        <div className="m-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" /> You&apos;re using the starter login. Set your own password below.
        </div>
      )}
      <form onSubmit={save} className="space-y-4 p-4">
        <div>
          <Label help="Letters, numbers, dots, dashes or @ (e.g. an email)">Login ID</Label>
          <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} />
        </div>
        <div>
          <Label help="Leave empty to keep the current password">New password</Label>
          <input type="password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          {strength && <div className={`mt-1 text-[11px] ${strength === "Too short" ? "text-red-600" : strength === "Strong" ? "text-emerald-600" : "text-amber-600"}`}>{strength}</div>}
        </div>
        {pw && (
          <div>
            <Label>Repeat new password</Label>
            <input type="password" className={inputCls} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </div>
        )}
        <div className="border-t border-neutral-200 pt-4">
          <Label help="Needed to confirm any change">Current password</Label>
          <input type="password" required className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </div>
        {err && <div className="rounded-lg bg-red-50 p-2.5 text-[12px] text-red-700">{err}</div>}
        <button disabled={busy || !current} className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-[13px] font-semibold text-white hover:bg-neutral-700 disabled:opacity-40">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save login
        </button>
      </form>
    </div>
  );
}
