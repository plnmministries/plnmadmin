import type { Metadata } from "next";
import { cookies } from "next/headers";
import { fontVariables } from "./fonts";
import { isLang, LANG_COOKIE } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paralokanestham Ministries",
  description: "A Spirit-filled church family in Hyderabad.",
  icons: { icon: "/brand/emblem.png" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  return (
    <html lang={isLang(saved) ? saved : "en"} className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
