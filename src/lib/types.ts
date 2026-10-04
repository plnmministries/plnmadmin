// Content model for the whole site. Everything the admin can edit lives here.

export type Link = { label: string; href: string };

export type Section = {
  id: string;
  type: string;
  hidden?: boolean;
  // Section-specific settings, described by the schema in sections/registry.
  props: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export type Page = {
  id: string;
  slug: string; // "" for home
  title: string;
  navLabel?: string;
  showInNav: boolean;
  hidden: boolean; // hidden pages 404 on the public site but stay editable
  seoTitle?: string;
  seoDescription?: string;
  sections: Section[];
};

export type Sermon = {
  id: string; // YouTube video id
  title: string;
  date: string; // YYYY-MM-DD, may be empty
  category: string;
  speaker: string;
  description?: string;
  featured?: boolean;
  hidden?: boolean;
};

export type SermonCategory = { id: string; name: string; description?: string };

export type ChurchEvent = {
  id: string;
  title: string;
  subtitle?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  time: string; // free text, e.g. "Timings will be updated soon"
  location: string;
  description: string;
  image?: string;
  tag?: string;
  featured?: boolean;
  hidden?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
};

export type ServiceTime = { label: string; time: string };

export type ConnectForm = {
  id: string;
  title: string;
  text: string;
  icon: string;
  buttonLabel: string;
  askMessage: boolean; // show a message box (e.g. prayer request text)
  messageLabel?: string;
  extraFields?: string[]; // additional single-line fields, e.g. "Area / Locality"
  whatsappIntro: string; // first line of the WhatsApp message
};

export type Settings = {
  churchName: string;
  shortName: string;
  teluguName: string;
  tagline: string;
  logo: string;
  emblem: string;
  phone: string;
  email: string;
  whatsapp: string; // digits incl. country code; empty = not set yet
  address: string;
  mapQuery: string;
  serviceDay: string;
  serviceTimes: ServiceTime[];
  socials: { youtube: string; instagram: string; facebook: string; x: string; whatsappChannel: string };
  youtubeChannelId: string;
  giving: {
    upiId: string;
    payeeName: string;
    qrImage: string; // uploaded QR (takes priority over the generated one)
    note: string;
  };
  connectForms: ConnectForm[];
  announcement: { enabled: boolean; text: string; href: string };
  footerBlurb: string;
};

export type Theme = {
  preset: string;
  colors: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    primary: string; // crimson
    accent: string; // gold
    glow: string; // stage glow (magenta/purple)
  };
  displayFont: string;
  bodyFont: string;
  radius: number;
  uppercaseHeadings: boolean;
};

export type SiteContent = {
  updatedAt: string;
  settings: Settings;
  theme: Theme;
  pages: Page[];
  sermons: Sermon[];
  sermonCategories: SermonCategory[];
  speakers: string[];
  events: ChurchEvent[];
  /** Telugu / Hindi text keyed by translation key (see lib/translatable.ts). English lives in the fields themselves. */
  translations: { te: Record<string, string>; hi: Record<string, string> };
};
