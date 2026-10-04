"use client";

import { createContext, useCallback, useContext, useRef, type ElementType, type ReactNode } from "react";
import type { Page, SiteContent } from "@/lib/types";
import { localeOf, uiText, type Lang, type UiKey } from "@/lib/i18n";
import { gKey, sKey, translate } from "@/lib/translatable";

// What the visual editor (admin) listens for. In the public site every handler is a no-op.
export type EditBridge = {
  editSection: (sectionId: string, field: string, value: unknown) => void;
  editGlobal: (path: string, value: unknown) => void;
  /** text edited while the editor shows Telugu/Hindi */
  editTranslation: (key: string, value: string) => void;
  select: (sectionId: string, field?: string) => void;
  action: (action: "up" | "down" | "duplicate" | "hide" | "delete" | "insert", sectionId: string) => void;
  openPanel: (panel: string) => void;
  navigate: (href: string) => void;
};

type SiteCtx = {
  content: SiteContent;
  page: Page;
  editing: boolean;
  selectedId?: string;
  bridge?: EditBridge;
  query: Record<string, string>;
  lang: Lang;
  setLang: (l: Lang) => void;
};

const Ctx = createContext<SiteCtx | null>(null);
const SectionIdCtx = createContext<string>("");

export function SiteProvider(props: SiteCtx & { children: ReactNode }) {
  const { children, ...value } = props;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSite() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSite outside SiteProvider");
  return c;
}

export function SectionScope({ id, children }: { id: string; children: ReactNode }) {
  return <SectionIdCtx.Provider value={id}>{children}</SectionIdCtx.Provider>;
}

export const useSectionId = () => useContext(SectionIdCtx);

/** Language helpers: ui() for fixed labels, tr() for content with a translation key, fmt() for dates. */
export function useLang() {
  const { lang, setLang, content } = useSite();
  const ui = useCallback((key: UiKey, vars?: Record<string, string | number>) => uiText(lang, key, vars), [lang]);
  const tr = useCallback((key: string, english: string | undefined) => translate(content, lang, key, english), [content, lang]);
  return { lang, setLang, ui, tr, locale: localeOf(lang) };
}

type TxtProps = {
  value: string | undefined;
  /** dotted field path inside the section's props, e.g. "title" or "items.2.text" */
  field?: string;
  /** dotted path into the whole content, for global text (e.g. "settings.tagline") */
  global?: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
};

// Raw text of a contentEditable element. Unlike innerText this ignores CSS
// text-transform (headings render uppercase but must be saved as typed),
// while still turning <br> and block elements into line breaks.
function readText(el: HTMLElement | null): string {
  if (!el) return "";
  let out = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += n.textContent;
    else if (n.nodeName === "BR") out += "\n";
    else if (n instanceof HTMLElement) out += (/^(DIV|P)$/.test(n.nodeName) && out && !out.endsWith("\n") ? "\n" : "") + readText(n);
  });
  return out;
}

// Text that becomes click-to-edit inside the visual editor.
export function Txt({ value, field, global, as: Tag = "span", className, multiline, placeholder }: TxtProps) {
  const { editing, bridge, content, lang } = useSite();
  const sid = useSectionId();
  const ref = useRef<HTMLElement>(null);
  const key = global ? gKey(global) : field ? sKey(sid, field) : "";
  const text = key ? translate(content, lang, key, value) : (value ?? "");

  if (!editing || (!field && !global)) {
    if (!text) return null;
    if (multiline && text.includes("\n")) {
      return (
        <Tag className={className} style={{ whiteSpace: "pre-line" }}>
          {text}
        </Tag>
      );
    }
    return <Tag className={className}>{text}</Tag>;
  }

  const commit = () => {
    const next = readText(ref.current).replace(/ /g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (next === text) return;
    if (lang !== "en") bridge?.editTranslation(key, next);
    else if (global) bridge?.editGlobal(global, next);
    else if (field) bridge?.editSection(sid, field, next);
  };

  return (
    <Tag
      ref={ref}
      className={className}
      style={multiline ? { whiteSpace: "pre-line" } : undefined}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-editable
      data-placeholder={placeholder || "Click to add text"}
      onBlur={commit}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
        if (e.key === "Escape") {
          if (ref.current) ref.current.innerText = text;
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      onPaste={(e: React.ClipboardEvent) => {
        // paste as plain text only
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      }}
    >
      {text}
    </Tag>
  );
}

// Click-to-change image hotspot in the editor (opens the field in the side panel).
export function EditHotspot({ field, label = "Change image" }: { field: string; label?: string }) {
  const { editing, bridge } = useSite();
  const sid = useSectionId();
  if (!editing) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        bridge?.select(sid, field);
      }}
      className="absolute right-3 top-3 z-20 rounded-full bg-sky-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg opacity-0 transition group-hover/edit:opacity-100"
    >
      {label}
    </button>
  );
}

// Inline "manage collection" chip shown on sections fed by shared data (sermons, events…).
export function ManageChip({ panel, label }: { panel: string; label: string }) {
  const { editing, bridge } = useSite();
  if (!editing) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        bridge?.openPanel(panel);
      }}
      className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-xl hover:bg-sky-600"
    >
      {label}
    </button>
  );
}
