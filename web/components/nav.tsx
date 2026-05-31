"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Wallet } from "lucide-react";
import { Logo } from "./logo";

type Me = {
    email?: string;
    balance_toman?: number;
    role?: "user" | "admin";
    price_per_lookup_toman?: number;
};

function fmtToman(n: number | undefined) {
    if (n == null) return "—";
    return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}

export default function Nav() {
    const pathname = usePathname() || "/";
    const [me, setMe] = useState<Me | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/me", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((m) => !cancelled && setMe(m))
            .catch(() => !cancelled && setMe(null))
            .finally(() => !cancelled && setLoaded(true));
        return () => { cancelled = true; };
    }, [pathname]);

    useEffect(() => { setOpen(false); }, [pathname]);

    // Scroll-progress + condensed header on scroll
    const [scrolled, setScrolled] = useState(false);
    const [progress, setProgress] = useState(0);
    const rafRef = useRef<number>(0);
    useEffect(() => {
        const tick = () => {
            rafRef.current = 0;
            const y = window.scrollY;
            setScrolled(y > 12);
            const h = document.documentElement.scrollHeight - window.innerHeight;
            setProgress(h > 0 ? Math.min(1, y / h) : 0);
        };
        const onScroll = () => {
            if (rafRef.current) return;
            rafRef.current = requestAnimationFrame(tick);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    async function logout() {
        try { await fetch("/api/auth/logout", { method: "POST" }); }
        finally { window.location.href = "/"; }
    }

    const isAdmin = me?.role === "admin";

    const links: { href: string; label: string; active: boolean }[] = !loaded
        ? []
        : me
        ? isAdmin
            ? [
                  { href: "/admin",            label: "داشبورد",       active: pathname === "/admin" },
                  { href: "/admin/users",      label: "کاربران",        active: pathname.startsWith("/admin/users") },
                  { href: "/admin/refunds",    label: "بازپرداخت",      active: pathname.startsWith("/admin/refunds") },
                  { href: "/admin/flags",      label: "گزارش‌ها",       active: pathname.startsWith("/admin/flags") },
                  { href: "/admin/providers",  label: "تامین‌کننده",   active: pathname.startsWith("/admin/providers") },
                  { href: "/admin/settings",   label: "تنظیمات",       active: pathname.startsWith("/admin/settings") },
              ]
            : [
                  { href: "/lookup",   label: "جست‌و‌جو", active: pathname === "/lookup" },
                  { href: "/batch",    label: "دسته‌ای",  active: pathname.startsWith("/batch") },
                  { href: "/keys",     label: "API",      active: pathname.startsWith("/keys") },
                  { href: "/referral", label: "دعوت",     active: pathname.startsWith("/referral") },
              ]
        : [
              { href: "/pricing", label: "تعرفه",         active: pathname.startsWith("/pricing") },
              { href: "/terms",   label: "قوانین",        active: pathname.startsWith("/terms") },
              { href: "/privacy", label: "حریم خصوصی",  active: pathname.startsWith("/privacy") },
          ];

    return (
        <header
            className={`sticky top-0 z-50 backdrop-blur-xl transition-[background,box-shadow,border-color,height] duration-300 ${
                scrolled
                    ? "bg-white/90 border-b border-rule shadow-[0_8px_24px_-18px_rgba(15,20,25,0.18)]"
                    : "bg-white/60 border-b border-transparent"
            }`}
        >
            {/* Scroll progress hairline */}
            <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-[2px] origin-right bg-gradient-to-l from-persimmon via-persimmon to-saffron"
                style={{
                    transform: `scaleX(${progress})`,
                    transformOrigin: "right",
                    opacity: scrolled ? 1 : 0,
                    transition: "opacity 0.3s, transform 0.06s linear",
                }}
            />
            <div
                className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 transition-[height] duration-300 ${
                    scrolled ? "h-14" : "h-16"
                }`}
            >
                {/* Brand */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <span className="relative inline-flex">
                        <Logo size={30} />
                        <span className="absolute -bottom-0.5 -end-0.5 size-2 rounded-full bg-jade ring-2 ring-white" aria-hidden />
                    </span>
                    <span className="text-lg font-extrabold tracking-tight text-bone group-hover:text-persimmon transition-colors">
                        TeleYab
                    </span>
                </Link>

                {/* Desktop links — pill-style on hover with persimmon-soft tint */}
                {loaded && (
                    <nav aria-label="ناوبریِ اصلی" className="hidden md:flex items-center gap-1 text-sm">
                        {me && isAdmin && (
                            <span className="inline-flex items-center gap-1.5 ms-1 me-2 text-xs font-bold text-persimmon">
                                <span className="dot-live" />
                                ادمین
                            </span>
                        )}
                        {links.map((l) => (
                            <NavLink key={l.href} href={l.href} active={l.active}>
                                {l.label}
                            </NavLink>
                        ))}
                    </nav>
                )}

                {/* Right cluster */}
                <div className="flex items-center gap-2">
                    {loaded && me ? (
                        <>
                            <Link
                                href="/wallet"
                                className="group hidden sm:inline-flex items-center gap-2 rounded-full bg-persimmon-soft text-persimmon-deep px-3.5 py-1.5 text-xs font-bold ring-1 ring-persimmon/15 hover:bg-persimmon hover:text-white hover:ring-persimmon transition-all hover:-translate-y-px hover:shadow-[0_8px_18px_-10px_rgba(34,158,217,0.6)]"
                                title="موجودی کیف پول"
                            >
                                <Wallet className="size-3.5 transition-transform group-hover:scale-110" />
                                <span dir="ltr" className="font-mono">{fmtToman(me.balance_toman)}</span>
                                <span>ت</span>
                            </Link>
                            <button
                                onClick={logout}
                                className="hidden sm:inline-flex t-btn t-btn-ghost t-btn-sm"
                            >
                                خروج
                            </button>
                        </>
                    ) : loaded ? (
                        <>
                            <Link href="/login" className="hidden sm:inline-flex t-btn t-btn-ghost t-btn-sm">
                                ورود
                            </Link>
                            <Link href="/login" className="t-btn t-btn-primary t-btn-sm">
                                شروع کن
                            </Link>
                        </>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-label="منو"
                        className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full text-bone hover:bg-night-700"
                    >
                        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile drawer */}
            {open && loaded && (
                <div className="md:hidden border-t border-rule bg-white animate-[nav-drop_0.25s_cubic-bezier(0.16,1,0.3,1)_both]">
                    <style>{`@keyframes nav-drop { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                    <nav aria-label="ناوبریِ موبایل" className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-col">
                        {me && (
                            <Link href="/wallet" className="py-3 text-sm flex items-center justify-between border-b border-rule-soft">
                                <span className="text-bone-soft">موجودی</span>
                                <span className="font-mono font-bold text-persimmon-deep">
                                    {fmtToman(me.balance_toman)} ت
                                </span>
                            </Link>
                        )}
                        {me && isAdmin && (
                            <div className="pt-3 pb-1 inline-flex items-center gap-2 text-xs font-bold text-persimmon">
                                <span className="dot-live" /> ادمین
                            </div>
                        )}
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={`border-b border-rule-soft py-3 text-base ${l.active ? "text-persimmon font-bold" : "text-bone-soft"}`}
                            >
                                {l.label}
                            </Link>
                        ))}
                        {me ? (
                            <button onClick={logout} className="text-start py-3 text-rose">خروج</button>
                        ) : (
                            <Link href="/login" className="mt-3 t-btn t-btn-primary">
                                شروع کن
                            </Link>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className={`relative px-3 py-1.5 rounded-full transition-all duration-200 ${
                active
                    ? "bg-persimmon-soft text-persimmon-deep"
                    : "text-bone-soft hover:text-bone hover:bg-night-700"
            }`}
        >
            <span className="relative">
                {children}
                {active && (
                    <span
                        aria-hidden
                        className="absolute -bottom-1 inset-x-1/2 h-[2px] w-3 -translate-x-1/2 rounded-full bg-persimmon"
                    />
                )}
            </span>
        </Link>
    );
}
