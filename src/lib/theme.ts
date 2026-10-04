import type { Theme } from "./types";

export const DISPLAY_FONTS: Record<string, { label: string; css: string }> = {
  cinzel: { label: "Cinzel (classic, like the logo)", css: "var(--font-cinzel)" },
  playfair: { label: "Playfair Display (elegant serif)", css: "var(--font-playfair)" },
  bebas: { label: "Bebas Neue (bold, modern)", css: "var(--font-bebas)" },
  cormorant: { label: "Cormorant (refined serif)", css: "var(--font-cormorant)" },
  manrope: { label: "Manrope (clean sans)", css: "var(--font-manrope)" },
};

export const BODY_FONTS: Record<string, { label: string; css: string }> = {
  manrope: { label: "Manrope", css: "var(--font-manrope)" },
  inter: { label: "Inter", css: "var(--font-inter)" },
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function isLight(hex: string) {
  const [r, g, b] = hexToRgb(hex).split(" ").map(Number);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

// CSS custom properties consumed by globals.css / Tailwind tokens.
export function themeVars(t: Theme): React.CSSProperties {
  const c = t.colors;
  return {
    "--bg": c.bg,
    "--surface": c.surface,
    "--fg": c.text,
    "--muted": c.muted,
    "--primary": c.primary,
    "--accent": c.accent,
    "--glow": c.glow,
    "--bg-rgb": hexToRgb(c.bg),
    "--fg-rgb": hexToRgb(c.text),
    "--primary-rgb": hexToRgb(c.primary),
    "--accent-rgb": hexToRgb(c.accent),
    "--glow-rgb": hexToRgb(c.glow),
    "--on-primary": isLight(c.primary) ? "#111111" : "#ffffff",
    "--on-accent": isLight(c.accent) ? "#111111" : "#ffffff",
    "--radius": `${t.radius}px`,
    "--site-display": (DISPLAY_FONTS[t.displayFont] || DISPLAY_FONTS.cinzel).css,
    "--site-body": (BODY_FONTS[t.bodyFont] || BODY_FONTS.manrope).css,
    "--heading-case": t.uppercaseHeadings ? "uppercase" : "none",
    colorScheme: isLight(c.bg) ? "light" : "dark",
  } as React.CSSProperties;
}
