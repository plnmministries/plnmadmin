"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { syncNow } from "./actions";

export function SyncButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-[11.5px] text-neutral-500">{msg}</span>}
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await syncNow();
              setMsg(`${r.added} new video${r.added === 1 ? "" : "s"}, ${r.notified} devices notified`);
            } catch (e) {
              setMsg((e as Error).message);
            }
          })
        }
        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Check YouTube now
      </button>
    </div>
  );
}
