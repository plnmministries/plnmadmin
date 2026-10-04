import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#08070c] p-6 text-center text-[#f7f3ea]">
      <div>
        <div className="font-[family-name:var(--font-cinzel)] text-7xl text-[#e3b24f]">404</div>
        <p className="mt-4 text-white/70">This page doesn&apos;t exist (yet).</p>
        <Link href="/" className="mt-8 inline-block rounded-full bg-[#c8102e] px-6 py-3 text-sm font-bold uppercase tracking-widest text-white">
          Go home
        </Link>
      </div>
    </div>
  );
}
