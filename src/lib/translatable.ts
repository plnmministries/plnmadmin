import type { Field } from "@/components/site/registry";
import { SECTIONS } from "@/components/site/registry";
import type { SiteContent } from "./types";
import type { Lang } from "./i18n";
import { getPath } from "./util";

// Translation keys:
//   s:<sectionId>:<field path>   section text      e.g. s:s-hero:title, s:s-hero:primary.label, s:s-cards:items.0.text
//   g:<content path>             shared settings   e.g. g:settings.footerBlurb
//   f:<formId>:<field>           connect forms     e.g. f:prayer:title, f:baptism:extra.0
//   e:<eventId>:<field>          events
//   p:<pageId>:navLabel          menu labels
//   c:<categoryId>:name          sermon categories

export const sKey = (sectionId: string, field: string) => `s:${sectionId}:${field}`;
export const gKey = (path: string) => `g:${path}`;

export type Translatable = { key: string; en: string; group: string; label: string; long?: boolean };

function fieldStrings(sectionId: string, fields: Field[], values: Record<string, unknown>, prefix: string, out: Translatable[], group: string, labelPrefix = "") {
  for (const f of fields) {
    const path = prefix + f.key;
    const v = getPath(values, f.key);
    if (f.type === "text" || f.type === "textarea") {
      // numbers like "13" or "4,200+" read the same in every language
      if (typeof v === "string" && v.trim() && !/^[\d\s,.+%:]+$/.test(v)) out.push({ key: sKey(sectionId, path), en: v, group, label: labelPrefix + f.label, long: f.type === "textarea" });
    } else if (f.type === "link") {
      const label = (v as { label?: string } | undefined)?.label;
      if (label?.trim()) out.push({ key: sKey(sectionId, `${path}.label`), en: label, group, label: `${labelPrefix}${f.label}` });
    } else if (f.type === "list" && Array.isArray(v)) {
      v.forEach((item, i) => fieldStrings(sectionId, f.itemFields, item as Record<string, unknown>, `${path}.${i}.`, out, group, `${labelPrefix}${f.itemLabel} ${i + 1} · `));
    }
  }
}

/** Every piece of visitor-facing text that can be translated, with its English source. */
export function collectStrings(c: SiteContent): Translatable[] {
  const out: Translatable[] = [];
  for (const page of c.pages) {
    const group = `Page: ${page.title}`;
    if (page.slug) out.push({ key: `p:${page.id}:navLabel`, en: page.navLabel || page.title, group, label: "Menu label" });
    for (const s of page.sections) {
      const def = SECTIONS[s.type];
      if (!def) continue;
      fieldStrings(s.id, def.fields, { ...def.defaults, ...s.props }, "", out, group, `${def.label} · `);
    }
  }
  const st = c.settings;
  const g = (path: string, label: string, long = false) => {
    const v = getPath(c, path);
    if (typeof v === "string" && v.trim()) out.push({ key: gKey(path), en: v, group: "Church info", label, long });
  };
  g("settings.announcement.text", "Announcement bar", true);
  g("settings.footerBlurb", "Footer text", true);
  g("settings.serviceDay", "Service day");
  st.serviceTimes.forEach((_, i) => g(`settings.serviceTimes.${i}.label`, `Service ${i + 1} name`));
  g("settings.address", "Address", true);
  g("settings.giving.note", "Giving note", true);
  for (const f of st.connectForms) {
    const group = "Get connected forms";
    out.push({ key: `f:${f.id}:title`, en: f.title, group, label: `${f.title} · title` });
    out.push({ key: `f:${f.id}:text`, en: f.text, group, label: `${f.title} · description`, long: true });
    out.push({ key: `f:${f.id}:buttonLabel`, en: f.buttonLabel, group, label: `${f.title} · button` });
    if (f.askMessage && f.messageLabel) out.push({ key: `f:${f.id}:messageLabel`, en: f.messageLabel, group, label: `${f.title} · message prompt` });
    (f.extraFields || []).forEach((x, i) => out.push({ key: `f:${f.id}:extra.${i}`, en: x, group, label: `${f.title} · field ${i + 1}` }));
  }
  for (const e of c.events) {
    const group = "Events";
    const add = (field: keyof typeof e, label: string, long = false) => {
      const v = e[field];
      if (typeof v === "string" && v.trim()) out.push({ key: `e:${e.id}:${field}`, en: v, group, label: `${e.title} · ${label}`, long });
    };
    add("title", "title");
    add("subtitle", "subtitle");
    add("time", "time");
    add("location", "location");
    add("description", "description", true);
    add("tag", "tag");
    add("ctaLabel", "button");
  }
  for (const cat of c.sermonCategories) {
    out.push({ key: `c:${cat.id}:name`, en: cat.name, group: "Sermon categories", label: "Name" });
    if (cat.description) out.push({ key: `c:${cat.id}:description`, en: cat.description, group: "Sermon categories", label: `${cat.name} · description`, long: true });
  }
  return out;
}

/** Translated text for a key, falling back to the English source. */
export function translate(c: SiteContent, lang: Lang, key: string, english: string | undefined): string {
  if (lang === "en") return english ?? "";
  return c.translations?.[lang]?.[key] || english || "";
}
