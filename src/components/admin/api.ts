"use client";

import { createContext, useContext } from "react";
import type { SiteContent } from "@/lib/types";
import type { Lang } from "@/lib/i18n";
import type { Editor } from "./useEditor";

export type PanelId = "sections" | "pages" | "sermons" | "events" | "giving" | "connect" | "settings" | "theme" | "translations" | "history" | "health" | "account";

export type EditorApi = {
  ed: Editor;
  content: SiteContent;
  pageId: string;
  setPageId: (id: string) => void;
  selectedId?: string;
  focusField?: string;
  select: (id?: string, field?: string) => void;
  panel: PanelId;
  openPanel: (p: PanelId) => void;
  openAddSection: (index: number) => void;
  toast: (msg: string, tone?: "ok" | "err") => void;
  /** language shown (and edited) on the canvas */
  editLang: Lang;
  setEditLang: (l: Lang) => void;
};

export const EditorApiCtx = createContext<EditorApi | null>(null);

export function useApi() {
  const a = useContext(EditorApiCtx);
  if (!a) throw new Error("useApi outside editor");
  return a;
}
