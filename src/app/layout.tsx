import type { Metadata } from "next";
import { cookies } from "next/headers";
import { fontVariables } from "./fonts";
import { isLang, LANG_COOKIE } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paralokanestham Ministries",
  description: "A Spirit-filled church family in Hyderabad.",
  // tab / home-screen icons come from app/favicon.ico, app/icon.png and app/apple-icon.png (church emblem)
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  return (
    <html lang={isLang(saved) ? saved : "en"} className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
