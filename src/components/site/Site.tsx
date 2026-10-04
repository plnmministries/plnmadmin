"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { Page, Section, SiteContent } from "@/lib/types";
import { themeVars } from "@/lib/theme";
import { SectionScope, SiteProvider, useSite, type EditBridge } from "./context";
import { SECTIONS } from "./registry";
import { VideoProvider } from "./video";
import { FormsProvider } from "./forms";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { Footer, Header } from "./chrome";

type Props = {
  content: SiteContent;
  page: Page;
  editing?: boolean;
  selectedId?: string;
  bridge?: EditBridge;
  query?: Record<string, string>;
  /** initial language (from the visitor's cookie, or the editor's language switch) */
  lang?: Lang;
};

export function Site({ content, page, editing = false, selectedId, bridge, query = {}, lang: initialLang = "en" }: Props) {
  const sections = page.sections.filter((s) => editing || !s.hidden);
  const [chosen, setChosen] = useState<Lang>(initialLang);
  // the editor drives the language from outside; visitors pick it themselves
  const lang = editing ? initialLang : chosen;
  const setLang = useCallback((l: Lang) => {
    setChosen(l);
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  // paint the page behind the site (iOS overscroll, address-bar gaps) in the theme colour, never white
  const bg = content.theme.colors.bg.replace(/[^#\w(),.% ]/g, "");
  return (
    <SiteProvider content={content} page={page} editing={editing} selectedId={selectedId} bridge={bridge} query={query} lang={lang} setLang={setLang}>
      <style>{`html,body{background-color:${bg}}`}</style>
      <div className={`site ${editing ? "is-editing" : ""}`} style={themeVars(content.theme)} lang={lang}>
        <FormsProvider>
        <VideoProvider>
          <Header />
          <main>
            {sections.map((s, i) => (
              <SectionScope key={s.id} id={s.id}>
                {editing ? (
                  <EditFrame section={s} index={i} count={sections.length}>
                    <RenderSection section={s} />
                  </EditFrame>
                ) : (
                  <RenderSection section={s} />
                )}
              </SectionScope>
            ))}
            {editing && sections.length === 0 && (
              <div className="grid min-h-[60vh] place-items-center pt-32">
                <button onClick={() => bridge?.action("insert", "")} className="rounded-full bg-sky-500 px-6 py-3 font-semibold text-white">
                  + Add your first section
                </button>
              </div>
            )}
          </main>
          <Footer />
        </VideoProvider>
        </FormsProvider>
      </div>
    </SiteProvider>
  );
}

function RenderSection({ section }: { section: Section }) {
  const def = SECTIONS[section.type];
  if (!def) return null;
  const C = def.component;
  return <C p={{ ...def.defaults, ...section.props }} />;
}

function EditFrame({ section, index, count, children }: { section: Section; index: number; count: number; children: ReactNode }) {
  const { selectedId, bridge } = useSite();
  const selected = selectedId === section.id;
  const label = SECTIONS[section.type]?.label || section.type;
  const tool = "grid h-8 w-8 place-items-center rounded-md text-white/90 hover:bg-white/15 disabled:opacity-30";
  const act = (a: Parameters<EditBridge["action"]>[0]) => (e: React.MouseEvent) => {
    e.stopPropagation();
    bridge?.action(a, section.id);
  };
  return (
    <div
      data-section-id={section.id}
      className="group/frame relative"
      onClick={() => bridge?.select(section.id)}
      style={section.hidden ? { opacity: 0.45, filter: "grayscale(0.6)" } : undefined}
    >
      {children}
      <div
        className={`pointer-events-none absolute inset-0 z-40 transition ${selected ? "ring-2 ring-inset ring-sky-400" : "ring-0 group-hover/frame:ring-2 group-hover/frame:ring-inset group-hover/frame:ring-sky-400/60"}`}
      />
      <div className={`absolute left-3 top-3 z-50 flex items-center gap-2 transition ${selected ? "opacity-100" : "opacity-0 group-hover/frame:opacity-100"}`}>
        <span className="rounded-md bg-sky-500 px-2.5 py-1 font-[family-name:var(--font-manrope)] text-[11px] font-semibold text-white shadow">{label}</span>
        {section.hidden && <span className="rounded-md bg-neutral-800 px-2 py-1 font-[family-name:var(--font-manrope)] text-[11px] font-semibold text-white">Hidden</span>}
      </div>
      <div className={`absolute right-3 top-3 z-50 flex items-center gap-0.5 rounded-lg bg-neutral-900/95 p-1 shadow-xl transition ${selected ? "opacity-100" : "opacity-0 group-hover/frame:opacity-100"}`}>
        <button title="Move up" className={tool} disabled={index === 0} onClick={act("up")}>
          <ArrowUp className="h-4 w-4" />
        </button>
        <button title="Move down" className={tool} disabled={index === count - 1} onClick={act("down")}>
          <ArrowDown className="h-4 w-4" />
        </button>
        <button title="Duplicate" className={tool} onClick={act("duplicate")}>
          <Copy className="h-4 w-4" />
        </button>
        <button title={section.hidden ? "Show" : "Hide"} className={tool} onClick={act("hide")}>
          {section.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button title="Delete" className={`${tool} hover:!bg-red-500`} onClick={act("delete")}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute -bottom-4 left-1/2 z-50 -translate-x-1/2 opacity-0 transition group-hover/frame:opacity-100">
        <button
          onClick={act("insert")}
          className="flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1.5 font-[family-name:var(--font-manrope)] text-xs font-semibold text-white shadow-lg hover:bg-sky-600"
        >
          <Plus className="h-3.5 w-3.5" /> Add section
        </button>
      </div>
    </div>
  );
}
