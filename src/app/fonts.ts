import { Cinzel, Manrope, Playfair_Display, Bebas_Neue, Inter, Noto_Sans_Telugu, Noto_Sans_Devanagari, Cormorant_Garamond } from "next/font/google";

// Display + body fonts the admin can switch between in the Theme panel.
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", weight: ["400", "500", "600", "700", "800"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", preload: false });
const bebas = Bebas_Neue({ subsets: ["latin"], variable: "--font-bebas", weight: "400", preload: false });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", preload: false });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-cormorant", weight: ["400", "500", "600", "700"], style: ["normal", "italic"] });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], variable: "--font-telugu", weight: ["400", "600", "700"] });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-devanagari", weight: ["400", "600", "700"] });

export const fontVariables = [cinzel, manrope, playfair, bebas, inter, cormorant, telugu, devanagari].map((f) => f.variable).join(" ");
