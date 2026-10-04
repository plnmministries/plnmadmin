import {
  Baby, BookOpen, Calendar, Car, Church, Coffee, Cross, Droplet, Droplets, Flame, Gift, Globe, HandHeart, Heart, HeartHandshake,
  Mic, Music, Radio, Smile, Sparkles, Star, Sun, Users, Wine, Crown, Bird, Mail, MapPin, Phone, Clock, PlayCircle, Hand,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Flame, Wine, Droplet, Droplets, BookOpen, HandHeart, HeartHandshake, Heart, Users, Smile, Music, Car, Baby, Church, Cross,
  Sparkles, Star, Sun, Gift, Globe, Mic, Radio, Coffee, Calendar, Crown, Bird, Mail, MapPin, Phone, Clock, PlayCircle, Hand,
};

export function Icon({ name, className }: { name?: string; className?: string }) {
  const C = (name && ICONS[name]) || Sparkles;
  return <C className={className} strokeWidth={1.6} />;
}

type P = { className?: string };
export const YouTubeIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
  </svg>
);
export const InstagramIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
  </svg>
);
export const FacebookIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z" />
  </svg>
);
export const XIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
  </svg>
);
export const WhatsAppIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.3-.3-.4-.5-.5z" />
  </svg>
);

// Payment app marks for the Give page (simplified, brand colours).
export const PhonePeLogo = ({ className }: P) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden>
    <rect width="48" height="48" rx="12" fill="#5F259F" />
    <path
      fill="#fff"
      d="M33.6 17.3c0-.9-.7-1.6-1.6-1.6h-3l-6.8-7.8c-.6-.7-1.6-.9-2.5-.6l-2.3.7c-.4.1-.5.6-.2.9l7.3 6.8H13.6c-.4 0-.6.3-.6.6v1.2c0 .9.7 1.6 1.6 1.6h1.6v5.8c0 4.3 2.3 6.9 6.2 6.9 1.2 0 2.2-.1 3.4-.6v3.9c0 1.1.9 2 2 2h1.7c.4 0 .7-.3.7-.7V18.9h2.5c.4 0 .6-.3.6-.6v-1zm-7.7 10.9c-.8.3-1.7.4-2.4.4-1.9 0-2.8-.9-2.8-3.1v-5.6h5.2v8.3z"
    />
  </svg>
);

export const GooglePayLogo = ({ className }: P) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden>
    <rect width="48" height="48" rx="12" fill="#fff" />
    <path fill="#4285F4" d="M37.6 24.3c0-1-.1-1.9-.3-2.8H24v5.3h7.7c-.3 1.8-1.3 3.3-2.8 4.3v3.5h4.5c2.6-2.4 4.2-6 4.2-10.3z" />
    <path fill="#34A853" d="M24 38c3.8 0 7-1.3 9.4-3.4l-4.5-3.5c-1.3.9-2.9 1.4-4.9 1.4-3.7 0-6.9-2.5-8-6H11.4v3.6C13.7 34.8 18.5 38 24 38z" />
    <path fill="#FBBC04" d="M16 26.5c-.3-.9-.4-1.8-.4-2.5s.1-1.7.4-2.5v-3.6h-4.6C10.5 19.8 10 21.8 10 24s.5 4.2 1.4 6.1l4.6-3.6z" />
    <path fill="#EA4335" d="M24 15.5c2.1 0 4 .7 5.5 2.1l4.1-4.1C31 11.2 27.8 10 24 10c-5.5 0-10.3 3.2-12.6 7.9l4.6 3.6c1.1-3.5 4.3-6 8-6z" />
  </svg>
);

export const PaytmLogo = ({ className }: P) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden>
    <rect width="48" height="48" rx="12" fill="#fff" />
    <text x="24" y="29.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="14.5" letterSpacing="-0.4">
      <tspan fill="#002E6E">pay</tspan>
      <tspan fill="#00BAF2">tm</tspan>
    </text>
  </svg>
);
