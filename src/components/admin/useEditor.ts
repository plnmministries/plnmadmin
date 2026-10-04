"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Page, Section, SiteContent } from "@/lib/types";
import { setPath, uid } from "@/lib/util";
import { SECTIONS } from "@/components/site/registry";

export type SaveState = "saved" | "saving" | "error" | "offline";

const HISTORY_LIMIT = 150;

// Central editor state: content + undo/redo + debounced autosave to the draft.
export function useEditor(initial: SiteContent, initialHasDraft: boolean) {
  const [content, setContent] = useState(initial);
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const past = useRef<SiteContent[]>([]);
  const future = useRef<SiteContent[]>([]);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const [hist, setHist] = useState({ undo: 0, redo: 0 });
  const syncHist = useCallback(() => setHist({ undo: past.current.length, redo: future.current.length }), []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(content);
  const dirty = useRef(false);

  const persist = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(latest.current) });
      if (res.status === 401) {
        window.location.replace("/admin/login?next=/admin");
        return;
      }
      if (!res.ok) throw new Error();
      setSaveState("saved");
      setHasDraft(true);
    } catch {
      dirty.current = true;
      setSaveState(navigator.onLine ? "error" : "offline");
    }
  }, []);

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 700);
    try {
      localStorage.setItem("plnm-draft-backup", JSON.stringify(latest.current));
    } catch {}
  }, [persist]);

  // Retry failed saves when the connection comes back, and flush on tab close.
  useEffect(() => {
    const online = () => dirty.current && persist();
    const before = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        persist();
        e.preventDefault();
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", before);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", before);
    };
  }, [persist]);

  /** Apply a change. `key` merges rapid edits of the same field into one undo step. */
  const commit = useCallback(
    (fn: (c: SiteContent) => SiteContent, key?: string) => {
      const prev = latest.current;
      const next = fn(prev);
      if (next === prev) return;
      const now = Date.now();
      const merge = key && lastKey.current?.key === key && now - lastKey.current.at < 1200;
      if (!merge) {
        past.current.push(prev);
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
      }
      lastKey.current = key ? { key, at: now } : null;
      future.current = [];
      latest.current = next;
      setContent(next);
      syncHist();
      scheduleSave();
    },
    [scheduleSave, syncHist],
  );

  const step = useCallback(
    (from: React.MutableRefObject<SiteContent[]>, to: React.MutableRefObject<SiteContent[]>) => {
      const target = from.current.pop();
      if (!target) return;
      to.current.push(latest.current);
      latest.current = target;
      lastKey.current = null;
      setContent(target);
      syncHist();
      scheduleSave();
    },
    [scheduleSave, syncHist],
  );
  const undo = useCallback(() => step(past, future), [step]);
  const redo = useCallback(() => step(future, past), [step]);

  /** Replace everything (after publish/discard/restore) without an undo step. */
  const reset = useCallback((c: SiteContent, draft: boolean) => {
    past.current = [];
    future.current = [];
    latest.current = c;
    dirty.current = false;
    setContent(c);
    setHasDraft(draft);
    setSaveState("saved");
    syncHist();
  }, [syncHist]);

  const flush = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persist();
  }, [persist]);

  return {
    content,
    commit,
    undo,
    redo,
    reset,
    flush,
    canUndo: hist.undo > 0,
    canRedo: hist.redo > 0,
    saveState,
    hasDraft,
    setHasDraft,
  };
}

export type Editor = ReturnType<typeof useEditor>;

// ---- pure helpers used by panels ----

export function pageIndex(c: SiteContent, pageId: string) {
  return c.pages.findIndex((p) => p.id === pageId);
}

export function updatePage(c: SiteContent, pageId: string, fn: (p: Page) => Page): SiteContent {
  return { ...c, pages: c.pages.map((p) => (p.id === pageId ? fn(p) : p)) };
}

export function updateSectionProp(c: SiteContent, pageId: string, sectionId: string, field: string, value: unknown) {
  return updatePage(c, pageId, (p) => ({
    ...p,
    sections: p.sections.map((s) => (s.id === sectionId ? { ...s, props: setPath(s.props, field, value) } : s)),
  }));
}

/** Sets (or clears, when empty) the Telugu/Hindi text for a translation key. */
export function setTranslation(c: SiteContent, lang: "te" | "hi", key: string, value: string): SiteContent {
  const all = c.translations || { te: {}, hi: {} };
  const cur = { ...(all[lang] || {}) };
  if (value.trim()) cur[key] = value;
  else delete cur[key];
  return { ...c, translations: { ...all, [lang]: cur } };
}

export function newSection(type: string): Section {
  const def = SECTIONS[type];
  return { id: uid("s"), type, props: structuredClone(def.defaults) };
}

export function sectionAction(c: SiteContent, pageId: string, sectionId: string, action: "up" | "down" | "duplicate" | "hide" | "delete"): { content: SiteContent; select?: string } {
  let select: string | undefined;
  const content = updatePage(c, pageId, (p) => {
    const list = [...p.sections];
    const i = list.findIndex((s) => s.id === sectionId);
    if (i < 0) return p;
    if (action === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
    if (action === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
    if (action === "duplicate") {
      const copy = { ...structuredClone(list[i]), id: uid("s") };
      list.splice(i + 1, 0, copy);
      select = copy.id;
    }
    if (action === "hide") list[i] = { ...list[i], hidden: !list[i].hidden };
    if (action === "delete") list.splice(i, 1);
    return { ...p, sections: list };
  });
  return { content, select };
}
