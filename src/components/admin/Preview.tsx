"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteContent } from "@/lib/types";
import { Site } from "@/components/site/Site";
import type { EditBridge } from "@/components/site/context";
import type { Lang } from "@/lib/i18n";

type State = { content: SiteContent; pageId: string; selectedId?: string; lang: Lang };

const send = (msg: Record<string, unknown>) => window.parent.postMessage({ source: "plnm-preview", ...msg }, window.location.origin);

export default function Preview() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.source !== "plnm-editor") return;
      if (e.data.type === "ping") send({ type: "ready" });
      if (e.data.type === "state") setState({ content: e.data.content, pageId: e.data.pageId, selectedId: e.data.selectedId, lang: e.data.lang || "en" });
      if (e.data.type === "scrollTo") {
        const el = document.querySelector(`[data-section-id="${e.data.id}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          // only scroll if the section isn't already mostly visible
          if (r.top < 0 || r.top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    window.addEventListener("message", on);
    send({ type: "ready" });

    // ⌘-click follows internal links inside the editor
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[data-href]") as HTMLAnchorElement | null;
      if (a && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        const href = a.dataset.href || "";
        if (href.startsWith("/")) send({ type: "navigate", href });
        else if (href) window.open(href, "_blank");
      }
    };
    // forward editor shortcuts typed while the canvas has focus
    const key = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const typing = (e.target as HTMLElement).closest("[contenteditable], input, textarea");
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (["k", "s"].includes(k) || (!typing && ["z", "y"].includes(k))) {
        e.preventDefault();
        send({ type: "key", key: e.key, metaKey: e.metaKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey });
      }
    };
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("message", on);
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", key);
    };
  }, []);

  const bridge = useMemo<EditBridge>(
    () => ({
      editSection: (id, field, value) => send({ type: "edit", id, field, value }),
      editGlobal: (path, value) => send({ type: "editGlobal", path, value }),
      editTranslation: (key, value) => send({ type: "editTr", key, value }),
      select: (id, field) => send({ type: "select", id, field }),
      action: (action, id) => send({ type: "action", action, id }),
      openPanel: (panel) => send({ type: "openPanel", panel }),
      navigate: (href) => send({ type: "navigate", href }),
    }),
    [],
  );

  if (!state) return <div className="grid h-screen place-items-center bg-[#08070c] text-sm text-white/50">Loading preview…</div>;
  const page = state.content.pages.find((p) => p.id === state.pageId) || state.content.pages[0];
  return <Site content={state.content} page={page} editing selectedId={state.selectedId} bridge={bridge} lang={state.lang} />;
}
