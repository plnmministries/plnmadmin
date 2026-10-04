import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getDraft, getPublished } from "@/lib/store";
import { isAdmin } from "@/lib/admin-guard";
import { Site } from "@/components/site/Site";
import { isLang, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function load(props: Props) {
  const { slug = [] } = await props.params;
  const sp = await props.searchParams;
  // Admins can open ?preview=draft to see unpublished changes.
  const jar = await cookies();
  const wantsDraft = sp.preview === "draft" && (await isAdmin());
  // ?lang=te in a shared link wins over the saved choice
  const fromUrl = typeof sp.lang === "string" ? sp.lang : undefined;
  const saved = jar.get(LANG_COOKIE)?.value;
  const lang = isLang(fromUrl) ? fromUrl : isLang(saved) ? saved : "en";
  const content = wantsDraft ? (await getDraft()).content : await getPublished();
  const page = content.pages.find((p) => p.slug === slug.join("/"));
  const query = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] ?? "" : v ?? ""]));
  return { content, page: page && (!page.hidden || wantsDraft) ? page : null, query, lang };
}

export async function generateViewport(): Promise<Viewport> {
  const { theme } = await getPublished();
  return { themeColor: theme.colors.bg, colorScheme: "dark light", viewportFit: "cover" };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { content, page } = await load(props);
  if (!page) return {};
  const s = content.settings;
  const title = page.seoTitle || (page.slug ? `${page.title} | ${s.churchName}` : s.churchName);
  return {
    title,
    description: page.seoDescription || s.footerBlurb,
    openGraph: { title, description: page.seoDescription || s.footerBlurb, images: ["/brand/logo.png"], siteName: s.churchName },
  };
}

export default async function Page(props: Props) {
  const { content, page, query, lang } = await load(props);
  if (!page) notFound();
  return <Site content={content} page={page} query={query} lang={lang} />;
}
