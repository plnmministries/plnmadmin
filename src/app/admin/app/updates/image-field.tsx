"use client";

import { useState } from "react";
import { ImageInput } from "@/components/admin/fields";

// Poster picker for updates: uses the editor's media library/upload, stores the URL in a hidden field.
export function ImageField({ name }: { name: string }) {
  const [url, setUrl] = useState("");
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-semibold text-neutral-700">Poster / image (optional)</div>
      <ImageInput value={url} onChange={setUrl} />
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
