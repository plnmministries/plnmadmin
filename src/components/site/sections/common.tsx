"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { isExternal } from "@/lib/util";
import type { Link as LinkT } from "@/lib/types";
import { Txt, useSite } from "../context";
import { useForms } from "../forms";

export function SmartLink({ href, className, children, onClick }: { href: string; className?: string; children: ReactNode; onClick?: () => void }) {
  const { editing } = useSite();
  const forms = useForms();
  if (editing) {
    // In the editor, links don't navigate (so text inside can be edited). Cmd/Ctrl+click is handled by the canvas.
    return (
      <a href={href} className={className} data-href={href} onClick={(e) => e.preventDefault()}>
        {children}
      </a>
    );
  }
  if (!href) return <span className={className}>{children}</span>;
  // "#form:prayer" opens that Get Connected form (then WhatsApp) from any button
  if (href.startsWith("#form:")) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          onClick?.();
          forms.open(href.slice(6));
        }}
      >
        {children}
      </button>
    );
  }
  if (isExternal(href)) {
    return (
      <a href={href} className={className} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function Btn({ link, field, variant = "primary", arrow }: { link?: LinkT; field: string; variant?: "primary" | "ghost" | "accent" | "light"; arrow?: boolean }) {
  const { editing } = useSite();
  if (!link || (!link.label && !editing)) return null;
  if (!link.label && editing) return null;
  return (
    <SmartLink href={link.href} className={`btn btn-${variant}`}>
      <Txt value={link.label} field={`${field}.label`} />
      {arrow && <ArrowRight className="h-4 w-4" />}
    </SmartLink>
  );
}

export function SectionHead({ p, align = "left", className = "" }: { p: Record<string, any>; align?: "left" | "center"; className?: string }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { editing } = useSite();
  if (!p.eyebrow && !p.title && !p.subtitle && !editing) return null;
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : ""} max-w-3xl ${className}`}>
      <Txt as="div" className="eyebrow mb-4" value={p.eyebrow} field="eyebrow" placeholder="Eyebrow text" />
      <Txt as="h2" className="h-display text-3xl md:text-5xl" value={p.title} field="title" placeholder="Section title" />
      <Txt as="p" className="mt-5 text-base leading-relaxed text-muted md:text-lg" value={p.subtitle} field="subtitle" placeholder="Optional subtitle" multiline />
    </div>
  );
}

export function Img({ src, alt = "", className }: { src?: string; alt?: string; className?: string }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
