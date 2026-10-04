import type { Section, SiteContent } from "./types";

// One-time content updates for sites that already have content saved (e.g. in the database).
// Each runs once: its id is recorded in content.appliedMigrations, so if the admin later removes
// what it added, it never comes back. Applied wherever content is read (admin + public site).

const FOLLOW_PROPS = {
  eyebrow: "Stay connected",
  title: "Follow us",
  subtitle: "Never miss a service, a prayer or a word. Tap to follow us on your favourite app.",
  items: [
    { platform: "youtube", label: "Subscribe", detail: "33.5K+ subscribers", href: "" },
    { platform: "instagram", label: "Follow", detail: "38K+ followers", href: "" },
    { platform: "facebook", label: "Follow", detail: "38K+ followers", href: "" },
    { platform: "whatsapp", label: "Join", detail: "Daily updates", href: "" },
  ],
};

const followText = (id: string) => ({
  te: {
    [`s:${id}:eyebrow`]: "అనుసంధానంగా ఉండండి",
    [`s:${id}:title`]: "మమ్మల్ని ఫాలో అవ్వండి",
    [`s:${id}:subtitle`]: "ఏ ఆరాధననూ, ప్రార్థననూ, వాక్యాన్నీ మిస్ అవ్వకండి. మీకు ఇష్టమైన యాప్‌లో మమ్మల్ని ఫాలో అవ్వడానికి నొక్కండి.",
    [`s:${id}:items.0.label`]: "సబ్‌స్క్రైబ్",
    [`s:${id}:items.0.detail`]: "33.5K+ సబ్‌స్క్రైబర్లు",
    [`s:${id}:items.1.label`]: "ఫాలో",
    [`s:${id}:items.1.detail`]: "38K+ ఫాలోవర్లు",
    [`s:${id}:items.2.label`]: "ఫాలో",
    [`s:${id}:items.2.detail`]: "38K+ ఫాలోవర్లు",
    [`s:${id}:items.3.label`]: "చేరండి",
    [`s:${id}:items.3.detail`]: "రోజువారీ అప్‌డేట్స్",
  },
  hi: {
    [`s:${id}:eyebrow`]: "जुड़े रहें",
    [`s:${id}:title`]: "हमें फ़ॉलो करें",
    [`s:${id}:subtitle`]: "कोई आराधना, प्रार्थना या वचन न छूटे। अपने पसंदीदा ऐप पर हमें फ़ॉलो करने के लिए टैप करें।",
    [`s:${id}:items.0.label`]: "सब्सक्राइब करें",
    [`s:${id}:items.0.detail`]: "33.5K+ सब्सक्राइबर",
    [`s:${id}:items.1.label`]: "फ़ॉलो करें",
    [`s:${id}:items.1.detail`]: "38K+ फ़ॉलोअर",
    [`s:${id}:items.2.label`]: "फ़ॉलो करें",
    [`s:${id}:items.2.detail`]: "38K+ फ़ॉलोअर",
    [`s:${id}:items.3.label`]: "जुड़ें",
    [`s:${id}:items.3.detail`]: "रोज़ाना अपडेट",
  },
});

function addFollow(c: SiteContent, pageSlug: string, id: string, place: (sections: Section[]) => number) {
  const page = c.pages.find((p) => p.slug === pageSlug);
  if (!page || page.sections.some((s) => s.type === "followUs")) return;
  const at = Math.max(0, Math.min(page.sections.length, place(page.sections)));
  page.sections.splice(at, 0, { id, type: "followUs", props: structuredClone(FOLLOW_PROPS) });
  const t = followText(id);
  c.translations ??= { te: {}, hi: {} };
  // never overwrite translations the admin has already edited
  c.translations.te = { ...t.te, ...(c.translations.te || {}) };
  c.translations.hi = { ...t.hi, ...(c.translations.hi || {}) };
}

const MIGRATIONS: { id: string; run: (c: SiteContent) => void }[] = [
  {
    id: "follow-us-2026-10",
    run(c) {
      // home: just before the "We'd love to pray with you" banner (or before the location block)
      addFollow(c, "", "s-follow", (ss) => {
        const cta = ss.findIndex((s) => s.id === "s-connect-cta");
        if (cta >= 0) return cta;
        const visit = ss.findIndex((s) => s.type === "visit");
        return visit >= 0 ? visit : ss.length;
      });
      // Get Connected: right after the prayer / baptism / volunteer cards
      addFollow(c, "connect", "s-follow-connect", (ss) => {
        const forms = ss.findIndex((s) => s.type === "connectOptions");
        return forms >= 0 ? forms + 1 : ss.length;
      });
    },
  },
];

export function migrate(c: SiteContent): SiteContent {
  const done = new Set(c.appliedMigrations || []);
  const pending = MIGRATIONS.filter((m) => !done.has(m.id));
  if (!pending.length) return c;
  const next = structuredClone(c);
  for (const m of pending) {
    m.run(next);
    done.add(m.id);
  }
  next.appliedMigrations = [...done];
  return next;
}
