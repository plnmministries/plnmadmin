"use client";

import type { ComponentType } from "react";
import { CardGrid, ComingSoon, CtaBanner, Hero, Leaders, PageHeader, RichText, SplitFeature, Stats, Verse } from "./sections/basic";
import { LatestSermon, SermonLibrary, VideoGrid } from "./sections/media";
import { ConnectOptions, EventsList, Giving, ServiceTimes, Visit } from "./sections/church";
import { WelcomeSlider } from "./sections/welcome";

export type Field =
  | { key: string; label: string; type: "text" | "textarea" | "image" | "url" | "youtube" | "toggle" | "icon" | "link" | "category" | "sermon"; help?: string; placeholder?: string }
  | { key: string; label: string; type: "number"; min?: number; max?: number; step?: number; help?: string; suffix?: string }
  | { key: string; label: string; type: "select"; options: { value: string | number; label: string }[]; help?: string }
  | { key: string; label: string; type: "list"; itemLabel: string; titleKey: string; itemFields: Field[]; newItem: Record<string, unknown>; help?: string };

export type SectionDef = {
  label: string;
  description: string;
  group: "Intro" | "Content" | "Media" | "Church";
  component: ComponentType<{ p: Record<string, any> }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  fields: Field[];
  defaults: Record<string, unknown>;
  /** which shared-data panel feeds this section, if any */
  dataPanel?: { panel: string; label: string };
};

const head: Field[] = [
  { key: "eyebrow", label: "Eyebrow", type: "text", help: "Small label above the title" },
  { key: "title", label: "Title", type: "text" },
  { key: "subtitle", label: "Subtitle", type: "textarea" },
];

export const SECTIONS: Record<string, SectionDef> = {
  welcome: {
    label: "Welcome slider",
    description: "Elevation-style opening: gradient or photo slides with a welcome line and buttons.",
    group: "Intro",
    component: WelcomeSlider,
    fields: [
      {
        key: "slides",
        label: "Slides",
        type: "list",
        itemLabel: "Slide",
        titleKey: "title",
        newItem: { title: "New slide", subtitle: "", background: "gradient", image: "", youtubeId: "", primary: { label: "Learn more", href: "/about" }, secondary: { label: "", href: "" } },
        itemFields: [
          { key: "title", label: "Headline", type: "text" },
          { key: "subtitle", label: "Subtitle", type: "textarea" },
          {
            key: "background",
            label: "Background",
            type: "select",
            options: [
              { value: "gradient", label: "Brand gradient" },
              { value: "photo", label: "Photo over gradient" },
              { value: "youtube", label: "YouTube video (muted)" },
            ],
          },
          { key: "image", label: "Photo", type: "image" },
          { key: "youtubeId", label: "YouTube video", type: "youtube" },
          { key: "primary", label: "Main button", type: "link" },
          { key: "secondary", label: "Second button", type: "link" },
        ],
      },
      { key: "autoplay", label: "Auto-advance slides", type: "toggle" },
      { key: "interval", label: "Seconds per slide", type: "number", min: 3, max: 15, step: 1, suffix: "s" },
      { key: "height", label: "Height", type: "select", options: [{ value: "large", label: "Large" }, { value: "full", label: "Full screen" }, { value: "medium", label: "Medium" }] },
      { key: "showServiceTimes", label: "Show service times", type: "toggle" },
    ],
    defaults: {
      slides: [{ title: "Welcome", subtitle: "", background: "gradient", image: "", youtubeId: "", primary: { label: "Get connected", href: "/connect" }, secondary: { label: "Learn more", href: "/about" } }],
      autoplay: true,
      interval: 7,
      height: "large",
      showServiceTimes: true,
    },
  },
  hero: {
    label: "Hero",
    description: "Big cinematic opening with headline, buttons and service times.",
    group: "Intro",
    component: Hero,
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Headline", type: "text" },
      { key: "verse", label: "Verse reference", type: "text", help: "Shown in gold under the headline" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "primary", label: "Primary button", type: "link" },
      { key: "secondary", label: "Secondary button", type: "link" },
      {
        key: "background",
        label: "Background",
        type: "select",
        options: [
          { value: "aurora", label: "Stage lights + photo" },
          { value: "image", label: "Photo only" },
          { value: "youtube", label: "YouTube video (muted loop)" },
        ],
      },
      { key: "image", label: "Background photo", type: "image" },
      { key: "youtubeId", label: "Background YouTube video", type: "youtube", help: "Used when background is 'YouTube video'" },
      { key: "imageOpacity", label: "Photo / video strength", type: "number", min: 0, max: 100, step: 5, suffix: "%" },
      { key: "height", label: "Height", type: "select", options: [{ value: "full", label: "Full screen" }, { value: "large", label: "Large" }, { value: "medium", label: "Medium" }] },
      { key: "showServiceTimes", label: "Show service times", type: "toggle" },
    ],
    defaults: {
      eyebrow: "Welcome home",
      title: "A new headline",
      subtitle: "Write a short, warm invitation here.",
      primary: { label: "Plan your visit", href: "/visit" },
      secondary: { label: "Watch live", href: "/sermons#live" },
      background: "aurora",
      image: "/images/ig/ig2.jpg",
      imageOpacity: 35,
      height: "large",
      showServiceTimes: false,
      verse: "",
    },
  },
  pageHeader: {
    label: "Page header",
    description: "Title banner for inner pages.",
    group: "Intro",
    component: PageHeader,
    fields: [...head, { key: "image", label: "Background photo", type: "image" }, { key: "size", label: "Size", type: "select", options: [{ value: "medium", label: "Medium" }, { value: "large", label: "Large" }] }],
    defaults: { eyebrow: "Eyebrow", title: "Page title", subtitle: "A short description of this page.", image: "", size: "medium" },
  },
  latestSermon: {
    label: "Latest message",
    description: "Feature the newest (or a chosen) sermon with an inline player.",
    group: "Media",
    component: LatestSermon,
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "mode", label: "Which video", type: "select", options: [{ value: "latest", label: "Featured / newest automatically" }, { value: "pick", label: "Pick a specific video" }] },
      { key: "videoId", label: "Video", type: "sermon", help: "Used when 'Pick a specific video' is selected" },
      { key: "ctaLabel", label: "Button label", type: "text" },
    ],
    defaults: { eyebrow: "Latest message", title: "Watch this week's service", mode: "latest", videoId: "", ctaLabel: "All messages" },
    dataPanel: { panel: "sermons", label: "Manage sermons" },
  },
  sermonLibrary: {
    label: "Sermon library",
    description: "Live player + searchable, categorised video library that plays on the site.",
    group: "Media",
    component: SermonLibrary,
    fields: [
      { key: "showLive", label: "Show live / next service block", type: "toggle" },
      { key: "liveTitle", label: "Live block title", type: "text" },
      { key: "liveText", label: "Live block text", type: "textarea" },
    ],
    defaults: { showLive: true, liveTitle: "Watch live", liveText: "Services stream live every Sunday." },
    dataPanel: { panel: "sermons", label: "Manage sermons" },
  },
  videoGrid: {
    label: "Video grid",
    description: "A row of videos from one category (e.g. testimonies).",
    group: "Media",
    component: VideoGrid,
    fields: [...head, { key: "category", label: "Category", type: "category" }, { key: "limit", label: "How many", type: "number", min: 2, max: 12, step: 1 }],
    defaults: { eyebrow: "Watch", title: "Videos", subtitle: "", category: "testimonies", limit: 4 },
    dataPanel: { panel: "sermons", label: "Manage sermons" },
  },
  cardGrid: {
    label: "Cards",
    description: "Grid of photo or icon cards that link anywhere.",
    group: "Content",
    component: CardGrid,
    fields: [
      ...head,
      { key: "style", label: "Card style", type: "select", options: [{ value: "image", label: "Photo cards" }, { value: "icon", label: "Icon cards" }] },
      { key: "columns", label: "Columns", type: "select", options: [{ value: 2, label: "2" }, { value: 3, label: "3" }, { value: 4, label: "4" }] },
      {
        key: "items",
        label: "Cards",
        type: "list",
        itemLabel: "Card",
        titleKey: "title",
        newItem: { title: "New card", text: "Describe it here.", image: "/images/ig/ig2.jpg", icon: "Sparkles", href: "", cta: "Learn more" },
        itemFields: [
          { key: "title", label: "Title", type: "text" },
          { key: "text", label: "Text", type: "textarea" },
          { key: "image", label: "Photo (photo cards)", type: "image" },
          { key: "icon", label: "Icon (icon cards)", type: "icon" },
          { key: "href", label: "Link", type: "url" },
          { key: "cta", label: "Link text", type: "text" },
        ],
      },
    ],
    defaults: {
      eyebrow: "Eyebrow",
      title: "Section title",
      subtitle: "",
      style: "icon",
      columns: 3,
      items: [
        { title: "First", text: "Describe it here.", icon: "Heart", href: "", cta: "" },
        { title: "Second", text: "Describe it here.", icon: "BookOpen", href: "", cta: "" },
        { title: "Third", text: "Describe it here.", icon: "Users", href: "", cta: "" },
      ],
    },
  },
  splitFeature: {
    label: "Image + text",
    description: "Story block with a photo beside rich text.",
    group: "Content",
    component: SplitFeature,
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "text", label: "Text", type: "textarea", help: "Leave a blank line between paragraphs" },
      { key: "image", label: "Photo", type: "image" },
      { key: "imagePosition", label: "Photo side", type: "select", options: [{ value: "right", label: "Right" }, { value: "left", label: "Left" }] },
      { key: "cta", label: "Button", type: "link" },
    ],
    defaults: { eyebrow: "Our story", title: "A title", text: "Tell the story here.", image: "/images/ig/ig2.jpg", imagePosition: "right", cta: { label: "Learn more", href: "/about" } },
  },
  stats: {
    label: "Numbers",
    description: "Big highlighted numbers.",
    group: "Content",
    component: Stats,
    fields: [
      {
        key: "items",
        label: "Numbers",
        type: "list",
        itemLabel: "Number",
        titleKey: "label",
        newItem: { value: "10+", label: "Something" },
        itemFields: [
          { key: "value", label: "Value", type: "text" },
          { key: "label", label: "Label", type: "text" },
        ],
      },
    ],
    defaults: { items: [{ value: "13", label: "Years" }, { value: "3", label: "Services" }, { value: "38K+", label: "Online family" }, { value: "4,200+", label: "Messages" }] },
  },
  leaders: {
    label: "Pastors / leaders",
    description: "Portrait cards for pastors and leaders.",
    group: "Church",
    component: Leaders,
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      {
        key: "items",
        label: "People",
        type: "list",
        itemLabel: "Person",
        titleKey: "name",
        newItem: { name: "Name", role: "Role", image: "", bio: "" },
        itemFields: [
          { key: "name", label: "Name", type: "text" },
          { key: "role", label: "Role", type: "text" },
          { key: "image", label: "Photo", type: "image" },
          { key: "bio", label: "Short bio", type: "textarea" },
        ],
      },
    ],
    defaults: { eyebrow: "Leadership", title: "Our pastors", items: [{ name: "Name", role: "Role", image: "/brand/pastor-isaac.jpg", bio: "" }] },
  },
  serviceTimes: {
    label: "Service times",
    description: "Sunday service times (edited once in Church info).",
    group: "Church",
    component: ServiceTimes,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
    ],
    defaults: { title: "Sunday service times", subtitle: "" },
    dataPanel: { panel: "settings", label: "Edit service times" },
  },
  eventsList: {
    label: "Events",
    description: "Upcoming events — past events hide automatically.",
    group: "Church",
    component: EventsList,
    fields: [
      ...head,
      { key: "layout", label: "Layout", type: "select", options: [{ value: "cards", label: "Cards" }, { value: "list", label: "Detailed list" }] },
      { key: "limit", label: "Max events", type: "number", min: 1, max: 20, step: 1 },
      { key: "ctaLabel", label: "'See all' button text", type: "text" },
    ],
    defaults: { eyebrow: "Coming up", title: "Upcoming events", subtitle: "", layout: "cards", limit: 3, ctaLabel: "See all events" },
    dataPanel: { panel: "events", label: "Manage events" },
  },
  giving: {
    label: "Giving (QR + bank)",
    description: "UPI QR code and bank details with copy buttons.",
    group: "Church",
    component: Giving,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
    ],
    defaults: { title: "Ways to give", subtitle: "" },
    dataPanel: { panel: "giving", label: "Edit QR & bank details" },
  },
  connectOptions: {
    label: "Get connected forms",
    description: "Prayer, baptism, volunteer… each opens a quick form that continues on WhatsApp.",
    group: "Church",
    component: ConnectOptions,
    fields: head,
    defaults: { eyebrow: "", title: "How can we help you?", subtitle: "" },
    dataPanel: { panel: "connect", label: "Edit forms & WhatsApp" },
  },
  visit: {
    label: "Location & map",
    description: "Address, directions, call button and Google Map.",
    group: "Church",
    component: Visit,
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "showMap", label: "Show map", type: "toggle" },
    ],
    defaults: { eyebrow: "Visit us", title: "Find us", text: "", showMap: true },
    dataPanel: { panel: "settings", label: "Edit address" },
  },
  verse: {
    label: "Scripture",
    description: "A large Bible verse.",
    group: "Content",
    component: Verse,
    fields: [
      { key: "text", label: "Verse", type: "textarea" },
      { key: "reference", label: "Reference", type: "text" },
    ],
    defaults: { text: "For God so loved the world, that he gave his only begotten Son…", reference: "John 3:16" },
  },
  ctaBanner: {
    label: "Call to action",
    description: "Bold coloured banner with buttons.",
    group: "Content",
    component: CtaBanner,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "primary", label: "Primary button", type: "link" },
      { key: "secondary", label: "Secondary button", type: "link" },
      { key: "tone", label: "Colour", type: "select", options: [{ value: "primary", label: "Crimson (primary)" }, { value: "accent", label: "Gold (accent)" }, { value: "dark", label: "Dark" }] },
    ],
    defaults: { title: "Take your next step", text: "", primary: { label: "Get connected", href: "/connect" }, secondary: { label: "", href: "" }, tone: "primary" },
  },
  richText: {
    label: "Text",
    description: "Title and paragraphs.",
    group: "Content",
    component: RichText,
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body", type: "textarea", help: "Leave a blank line between paragraphs" },
      { key: "align", label: "Alignment", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Centre" }] },
    ],
    defaults: { eyebrow: "", title: "A title", body: "Write something here.", align: "left" },
  },
  comingSoon: {
    label: "Coming soon",
    description: "Placeholder card for content that's on its way.",
    group: "Content",
    component: ComingSoon,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "icon", label: "Icon", type: "icon" },
    ],
    defaults: { title: "Coming soon", text: "Details will be shared here soon.", icon: "Sparkles" },
  },
};
