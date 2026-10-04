"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, GripVertical, ImagePlus, Link2, Loader2, Plus, Search, Trash2, Upload, X, Copy } from "lucide-react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Field } from "@/components/site/registry";
import { ICONS, Icon } from "@/components/site/icons";
import type { SiteContent } from "@/lib/types";
import { getPath, parseYouTubeId, setPath, sortedSermons, ytThumb } from "@/lib/util";

export const inputCls =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";

export function Label({ children, help, right }: { children: ReactNode; help?: string; right?: ReactNode }) {
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-neutral-700">{children}</span>
        {right}
      </div>
      {help && <div className="mt-0.5 text-[11px] leading-snug text-neutral-500">{help}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; help?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1">
      <span>
        <span className="text-[13px] font-medium text-neutral-800">{label}</span>
        {help && <span className="block text-[11px] text-neutral-500">{help}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-sky-500" : "bg-neutral-300"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function Text({ value, onChange, placeholder, multiline, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number }) {
  return multiline ? (
    <textarea className={`${inputCls} resize-y leading-relaxed`} rows={rows} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input className={inputCls} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  );
}

// Suggests internal pages + common anchors as you type a link.
export function UrlInput({ value, onChange, content }: { value: string; onChange: (v: string) => void; content: SiteContent }) {
  const id = useId();
  const options = [
    ...content.pages.map((p) => ({ v: p.slug ? `/${p.slug}` : "/", l: p.title })),
    { v: "/sermons#live", l: "Watch live" },
    ...content.settings.connectForms.map((f) => ({ v: `#form:${f.id}`, l: `Open form: ${f.title} (then WhatsApp)` })),
    ...content.sermonCategories.map((c) => ({ v: `/sermons?category=${c.id}`, l: `Sermons: ${c.name}` })),
    { v: content.settings.socials.youtube, l: "YouTube channel" },
    { v: `tel:${content.settings.phone.replace(/\s/g, "")}`, l: "Call the church" },
  ];
  return (
    <div className="relative">
      <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
      <input list={id} className={`${inputCls} pl-8`} value={value ?? ""} placeholder="/page or https://…" onChange={(e) => onChange(e.target.value)} />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </datalist>
    </div>
  );
}

// ---------------- Media ----------------

export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}

export function MediaLibrary({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [data, setData] = useState<{ uploads: string[]; builtIn: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetch("/api/admin/media").then((r) => r.json()).then(setData).catch(() => setErr("Couldn't load media"));
  }, []);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setErr("");
    try {
      const u = await uploadFile(files[0]);
      onPick(u);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const yt = parseYouTubeId(url);
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/40 p-6" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files);
        }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="font-semibold">Choose an image</div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b bg-neutral-50 px-5 py-3">
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-[13px] font-semibold text-white hover:bg-neutral-700">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload from computer
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files)} />
          <span className="text-[12px] text-neutral-500">or drag & drop anywhere here</span>
          <div className="ml-auto flex w-full gap-2 md:w-96">
            <input className={inputCls} placeholder="Paste image URL or YouTube link" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button
              disabled={!url}
              onClick={() => onPick(yt ? ytThumb(yt, "max") : url)}
              className="shrink-0 rounded-lg border border-neutral-300 px-3 text-[13px] font-semibold disabled:opacity-40"
            >
              Use
            </button>
          </div>
        </div>
        {err && <div className="bg-red-50 px-5 py-2 text-[13px] text-red-700">{err}</div>}
        <div className="flex-1 overflow-y-auto p-5">
          {!data && <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-neutral-400" />}
          {data && (
            <>
              {data.uploads.length > 0 && <Grid title="Your uploads" items={data.uploads} onPick={onPick} />}
              <Grid title="Church photos" items={data.builtIn} onPick={onPick} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Grid({ title, items, onPick }: { title: string; items: string[]; onPick: (u: string) => void }) {
  return (
    <div className="mb-6">
      <div className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">{title}</div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {items.map((u) => (
          <button key={u} onClick={() => onPick(u)} className="group relative aspect-square overflow-hidden rounded-lg border bg-neutral-100 hover:ring-2 hover:ring-sky-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const drop = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      onChange(await uploadFile(files[0]));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-lg border-2 border-dashed ${over ? "border-sky-500 bg-sky-50" : "border-neutral-300 bg-neutral-50"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          drop(e.dataTransfer.files);
        }}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="aspect-video w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition group-hover:opacity-100">
              <button type="button" onClick={() => setOpen(true)} className="rounded-md bg-white px-3 py-1.5 text-[12px] font-semibold">
                Change
              </button>
              <button type="button" onClick={() => onChange("")} className="rounded-md bg-white/90 p-1.5 text-red-600" title="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="flex aspect-video w-full flex-col items-center justify-center gap-1 text-neutral-500">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            <span className="text-[12px] font-medium">Select or drop image</span>
          </button>
        )}
      </div>
      {open && (
        <MediaLibrary
          onClose={() => setOpen(false)}
          onPick={(u) => {
            onChange(u);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

export function IconInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={`${inputCls} flex items-center gap-2`}>
        <Icon name={value} className="h-4 w-4" /> {value || "Choose icon"} <ChevronDown className="ml-auto h-4 w-4 text-neutral-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 grid w-full grid-cols-6 gap-1 rounded-lg border bg-white p-2 shadow-xl">
          {Object.keys(ICONS).map((n) => (
            <button
              type="button"
              key={n}
              title={n}
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
              className={`grid aspect-square place-items-center rounded-md hover:bg-sky-50 ${value === n ? "bg-sky-100 text-sky-700" : "text-neutral-700"}`}
            >
              <Icon name={n} className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SermonPicker({ value, onChange, content }: { value: string; onChange: (v: string) => void; content: SiteContent }) {
  const [q, setQ] = useState("");
  const list = sortedSermons(content).filter((s) => !q || s.title.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  const cur = content.sermons.find((s) => s.id === value);
  return (
    <div className="space-y-2">
      {cur && (
        <div className="flex items-center gap-2 rounded-lg border bg-neutral-50 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ytThumb(cur.id, "mq")} alt="" className="h-9 w-16 rounded object-cover" />
          <div className="line-clamp-2 text-[12px]">{cur.title}</div>
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        <input className={`${inputCls} pl-8`} placeholder="Search sermons…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-lg border">
        {list.map((s) => (
          <button key={s.id} type="button" onClick={() => onChange(s.id)} className={`flex w-full items-center gap-2 p-2 text-left text-[12px] hover:bg-sky-50 ${s.id === value ? "bg-sky-50" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ytThumb(s.id, "mq")} alt="" className="h-8 w-14 shrink-0 rounded object-cover" loading="lazy" />
            <span className="line-clamp-2">{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Sortable list ----------------

function SortableRow({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, position: "relative" }}>
      {children(
        <span {...attributes} {...listeners} className="cursor-grab touch-none rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </span>,
      )}
    </div>
  );
}

export function SortableList<T>({ items, getId, onReorder, render }: { items: T[]; getId: (t: T, i: number) => string; onReorder: (items: T[]) => void; render: (item: T, index: number, handle: ReactNode) => ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const dndId = useId(); // stable across server/client render (avoids hydration mismatch)
  const ids = items.map(getId);
  const onEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onReorder(arrayMove(items, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  };
  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {items.map((it, i) => (
          <SortableRow key={ids[i]} id={ids[i]}>
            {(handle) => render(it, i, handle)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}

// ---------------- Schema-driven form ----------------

type FormProps = {
  fields: Field[];
  values: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  onChange: (path: string, value: unknown) => void;
  content: SiteContent;
  focusField?: string;
  prefix?: string;
};

export function FieldsForm({ fields, values, onChange, content, focusField, prefix = "" }: FormProps) {
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <FieldControl key={f.key} f={f} value={getPath(values, f.key)} onChange={(v) => onChange(f.key, v)} content={content} focused={focusField === prefix + f.key || !!focusField?.startsWith(prefix + f.key + ".")} focusField={focusField} path={prefix + f.key} />
      ))}
    </div>
  );
}

function FieldControl({
  f,
  value,
  onChange,
  content,
  focused,
  focusField,
  path,
}: {
  f: Field;
  value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  onChange: (v: unknown) => void;
  content: SiteContent;
  focused: boolean;
  focusField?: string;
  path: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({ block: "center", behavior: "smooth" });
      ref.current.animate([{ background: "rgb(56 189 248 / 0.25)" }, { background: "transparent" }], { duration: 1400 });
    }
  }, [focused]);

  let control: ReactNode = null;
  switch (f.type) {
    case "text":
      control = <Text value={value} onChange={onChange} placeholder={f.placeholder} />;
      break;
    case "textarea":
      control = <Text value={value} onChange={onChange} multiline />;
      break;
    case "url":
      control = <UrlInput value={value} onChange={onChange} content={content} />;
      break;
    case "image":
      control = <ImageInput value={value} onChange={onChange} />;
      break;
    case "icon":
      control = <IconInput value={value} onChange={onChange} />;
      break;
    case "toggle":
      return (
        <div ref={ref}>
          <Toggle checked={!!value} onChange={onChange} label={f.label} help={f.help} />
        </div>
      );
    case "number":
      control = (
        <div className="flex items-center gap-3">
          <input type="range" min={f.min ?? 0} max={f.max ?? 100} step={f.step ?? 1} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-sky-500" />
          <span className="w-12 text-right text-[12px] tabular-nums text-neutral-600">
            {value}
            {f.suffix}
          </span>
        </div>
      );
      break;
    case "select":
      control = (
        <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(typeof f.options[0]?.value === "number" ? Number(e.target.value) : e.target.value)}>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case "category":
      control = (
        <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          {content.sermonCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      );
      break;
    case "sermon":
      control = <SermonPicker value={value} onChange={onChange} content={content} />;
      break;
    case "youtube":
      control = (
        <div className="flex items-center gap-2">
          <input className={inputCls} value={value ?? ""} placeholder="Paste a YouTube link" onChange={(e) => onChange(parseYouTubeId(e.target.value) || e.target.value)} />
          {parseYouTubeId(value || "") && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ytThumb(value, "mq")} alt="" className="h-9 w-16 shrink-0 rounded object-cover" />
          )}
        </div>
      );
      break;
    case "link":
      control = (
        <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
          <input className={inputCls} placeholder="Button text (empty = hidden)" value={value?.label ?? ""} onChange={(e) => onChange({ ...(value || {}), label: e.target.value })} />
          <UrlInput value={value?.href ?? ""} onChange={(v) => onChange({ ...(value || {}), href: v })} content={content} />
        </div>
      );
      break;
    case "list":
      control = <ListControl f={f} value={value || []} onChange={onChange} content={content} focusField={focusField} path={path} />;
      break;
  }
  return (
    <div ref={ref} className="rounded-md">
      <Label help={f.help}>{f.label}</Label>
      {control}
    </div>
  );
}

function ListControl({
  f,
  value,
  onChange,
  content,
  focusField,
  path,
}: {
  f: Extract<Field, { type: "list" }>;
  value: Record<string, unknown>[];
  onChange: (v: unknown) => void;
  content: SiteContent;
  focusField?: string;
  path: string;
}) {
  const focusedIndex = focusField?.startsWith(path + ".") ? Number(focusField.slice(path.length + 1).split(".")[0]) : -1;
  const [open, setOpen] = useState<number>(focusedIndex);
  // open the item that was clicked on the canvas
  const [prevFocus, setPrevFocus] = useState(focusedIndex);
  if (focusedIndex !== prevFocus) {
    setPrevFocus(focusedIndex);
    if (focusedIndex >= 0) setOpen(focusedIndex);
  }

  return (
    <div className="space-y-2">
      <SortableList
        items={value}
        getId={(_, i) => `item-${i}`}
        onReorder={(items) => {
          setOpen(-1);
          onChange(items);
        }}
        render={(item, i, handle) => (
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              {handle}
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="min-w-0 flex-1 truncate text-left text-[13px] font-medium">
                {String(item[f.titleKey] || `${f.itemLabel} ${i + 1}`)}
              </button>
              <button type="button" title="Duplicate" onClick={() => onChange([...value.slice(0, i + 1), structuredClone(item), ...value.slice(i + 1)])} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <ChevronDown className={`h-4 w-4 text-neutral-400 transition ${open === i ? "rotate-180" : ""}`} />
            </div>
            {open === i && (
              <div className="border-t border-neutral-100 p-3">
                <FieldsForm fields={f.itemFields} values={item} onChange={(k, v) => onChange(value.map((it, j) => (j === i ? setPath(it, k, v) : it)))} content={content} focusField={focusField} prefix={`${path}.${i}.`} />
              </div>
            )}
          </div>
        )}
      />
      <button
        type="button"
        onClick={() => {
          onChange([...value, structuredClone(f.newItem)]);
          setOpen(value.length);
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 py-2 text-[12px] font-semibold text-sky-700 hover:border-sky-500 hover:bg-sky-50"
      >
        <Plus className="h-3.5 w-3.5" /> Add {f.itemLabel.toLowerCase()}
      </button>
    </div>
  );
}

export function Section({ title, children, right, defaultOpen = true }: { title: string; children: ReactNode; right?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-neutral-200">
      <div className="flex w-full items-center justify-between px-4 py-3">
        <button type="button" onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-1.5 text-left text-[13px] font-semibold text-neutral-900">
          <ChevronDown className={`h-4 w-4 text-neutral-400 transition ${open ? "" : "-rotate-90"}`} />
          {title}
        </button>
        {right}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
