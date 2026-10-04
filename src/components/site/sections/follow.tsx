"use client";

import type { ComponentType } from "react";
import { ArrowUpRight } from "lucide-react";
import { Txt, useSite } from "../context";
import { FacebookIcon, InstagramIcon, WhatsAppIcon, XIcon, YouTubeIcon } from "../icons";
import { SectionHead } from "./common";

type P = { p: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any

type Platform = "youtube" | "instagram" | "facebook" | "whatsapp" | "x";

const PLATFORMS: Record<Platform, { name: string; Icon: ComponentType<{ className?: string }>; bg: string; social: "youtube" | "instagram" | "facebook" | "whatsappChannel" | "x" }> = {
  youtube: { name: "YouTube", Icon: YouTubeIcon, bg: "#FF0000", social: "youtube" },
  instagram: { name: "Instagram", Icon: InstagramIcon, bg: "linear-gradient(45deg,#f58529,#dd2a7b 45%,#8134af 75%,#515bd4)", social: "instagram" },
  facebook: { name: "Facebook", Icon: FacebookIcon, bg: "#1877F2", social: "facebook" },
  whatsapp: { name: "WhatsApp", Icon: WhatsAppIcon, bg: "#25D366", social: "whatsappChannel" },
  x: { name: "X", Icon: XIcon, bg: "#000000", social: "x" },
};

/** Where a follow button goes: the item's own link, else the church's profile from Church info. */
function linkFor(platform: Platform, href: string | undefined, socials: Record<string, string>) {
  if (href) return href;
  const base = socials[PLATFORMS[platform].social] || "";
  // YouTube opens with the "Subscribe" prompt already showing
  return platform === "youtube" && base ? `${base.replace(/\/$/, "")}?sub_confirmation=1` : base;
}

export function FollowUs({ p }: P) {
  const { content, editing } = useSite();
  const items: { platform: Platform; label: string; detail: string; href?: string }[] = (p.items || []).filter((it: { platform: Platform }) => PLATFORMS[it.platform]);
  return (
    <section className="section-pad relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-72 max-w-4xl -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(var(--glow-rgb)/0.25),transparent)] blur-2xl" />
      <div className="wrap relative">
        <SectionHead p={p} align="center" className="mb-10 md:mb-14" />
        <div className={`mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:gap-5 ${items.length >= 4 ? "lg:grid-cols-4" : items.length === 3 ? "lg:grid-cols-3" : ""}`}>
          {items.map((it, i) => {
            const pf = PLATFORMS[it.platform];
            const href = linkFor(it.platform, it.href, content.settings.socials as unknown as Record<string, string>);
            return (
              <a
                key={i}
                href={href || undefined}
                target="_blank"
                rel="noreferrer"
                onClick={editing ? (e) => e.preventDefault() : undefined}
                aria-label={`${it.label} on ${pf.name}`}
                className="reveal card group relative flex flex-col items-center overflow-hidden p-5 text-center transition hover:-translate-y-1 hover:border-fg/25 active:scale-[0.98] sm:p-7"
              >
                <span className="pointer-events-none absolute -top-16 h-32 w-32 rounded-full opacity-25 blur-3xl transition group-hover:opacity-45" style={{ background: pf.bg }} />
                <span className="relative grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg sm:h-16 sm:w-16" style={{ background: pf.bg }}>
                  <pf.Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                </span>
                <span className="relative mt-4 text-base font-bold sm:text-lg">{pf.name}</span>
                <Txt as="span" className="relative mt-1 min-h-[1.25rem] text-xs text-muted sm:text-sm" value={it.detail} field={`items.${i}.detail`} />
                <span
                  className="relative mt-5 inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-3 text-[12.5px] font-bold uppercase tracking-[0.1em] text-white sm:text-sm"
                  style={{ background: pf.bg }}
                >
                  <Txt value={it.label} field={`items.${i}.label`} />
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
