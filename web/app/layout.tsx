import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import { Logo } from "@/components/logo";
import { OrganizationLD } from "@/components/schema-ld";
import RouteMount from "@/components/route-mount";
import RefCapture from "@/components/ref-capture";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

const DESCRIPTION =
    "TeleYab — جست‌و‌جوی شمارهٔ موبایل از روی @username یا آی‌دیِ عددیِ تلگرام. پایگاه دادهٔ بزرگ. فقط برای نتایجِ موفق پرداخت می‌کنی.";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: "TeleYab — یوزرنیم تلگرام به شماره", template: "%s · TeleYab" },
    description: DESCRIPTION,
    keywords: [
        "TeleYab", "تله یاب", "یوزرنیم تلگرام به شماره", "آی‌دی تلگرام به شماره",
        "شماره از یوزرنیم تلگرام", "Telegram username to phone",
    ],
    authors: [{ name: "TeleYab" }],
    applicationName: "TeleYab",
    alternates: { canonical: "/" },
    openGraph: {
        type: "website",
        locale: "fa_IR",
        siteName: "TeleYab",
        title: "TeleYab — یوزرنیم تلگرام به شماره",
        description: DESCRIPTION,
        url: "/",
    },
    twitter: { card: "summary_large_image", title: "TeleYab", description: DESCRIPTION },
    robots: { index: true, follow: true },
    other: { "color-scheme": "light" },
};

export const viewport: Viewport = {
    themeColor: "#ffffff",
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fa" dir="rtl">
            <head>
                {/* Preconnect (active warm-up) + dns-prefetch fallback for older
                    UAs that ignore preconnect.  All three hosts are used for
                    web fonts and must resolve before first paint. */}
                <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
                <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
                <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

                {/* Preload the two Vazirmatn weights that 95% of body copy uses
                    (Regular 400 + Bold 700) so they start downloading in
                    parallel with the stylesheet that references them.  Without
                    this preload the woff2 isn't fetched until the @font-face
                    CSS has parsed, which serialises two RTTs. */}
                <link
                    rel="preload"
                    as="font"
                    type="font/woff2"
                    crossOrigin=""
                    href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-Regular.woff2"
                />
                <link
                    rel="preload"
                    as="font"
                    type="font/woff2"
                    crossOrigin=""
                    href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-Bold.woff2"
                />

                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
                />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
                />
                <OrganizationLD siteUrl={SITE_URL} />
            </head>
            <body>
                <RefCapture />
                <a
                    href="#main"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:inset-s-3 focus:z-100 t-btn t-btn-primary t-btn-sm"
                >
                    پرش به محتوا
                </a>
                <div className="tg-wallpaper" aria-hidden />
                <Nav />
                <main
                    id="main"
                    aria-label="محتوای اصلی"
                    className="min-h-[60vh] relative z-10"
                >
                    <RouteMount>{children}</RouteMount>
                </main>
                <SiteFooter />
            </body>
        </html>
    );
}

function SiteFooter() {
    return (
        <footer className="relative z-10 mt-24 overflow-hidden">
            <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
                <div className="absolute -top-24 -end-24 size-72 rounded-full bg-persimmon-soft blur-3xl blob-drift" />
                <div
                    className="absolute -bottom-24 -start-24 size-72 rounded-full bg-saffron/10 blur-3xl blob-drift"
                    style={{ animationDelay: "2s" }}
                />
            </div>
            <div className="border-t border-rule bg-white/60 backdrop-blur-md">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 lg:px-8">
                    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="sm:col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-2.5">
                                <span className="relative inline-flex">
                                    <Logo size={28} />
                                    <span
                                        className="absolute -bottom-0.5 -end-0.5 size-2 rounded-full bg-jade ring-2 ring-white"
                                        aria-hidden
                                    />
                                </span>
                                <span className="text-xl font-extrabold tracking-tight text-bone">TeleYab</span>
                            </div>
                            <p className="mt-5 max-w-md text-sm leading-loose text-bone-soft">
                                یوزرنیم یا آی‌دیِ عددیِ تلگرام را بده، شمارهٔ موبایلش را برمی‌گردانیم.
                                فقط اگر پیدا کردیم پرداخت می‌کنی.
                            </p>
                            <div className="mt-5 inline-flex items-center gap-2 text-[11px] text-bone-dim">
                                <span className="dot-live" />
                                هم‌اکنون آنلاین و در حالِ پاسخ‌گویی
                            </div>
                        </div>

                        <FooterCol
                            title="محصول"
                            links={[
                                { href: "/lookup", label: "جست‌و‌جو" },
                                { href: "/batch", label: "دسته‌ای" },
                                { href: "/keys", label: "API" },
                                { href: "/pricing", label: "تعرفه" },
                            ]}
                        />
                        <FooterCol
                            title="حساب"
                            links={[
                                { href: "/login", label: "ورود" },
                                { href: "/topup", label: "شارژ" },
                                { href: "/wallet", label: "کیف پول" },
                                { href: "/referral", label: "دعوت" },
                            ]}
                        />
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-4 border-t border-rule pt-6 sm:flex-row sm:justify-between">
                        <span className="text-xs text-bone-dim">© TeleYab · ۱۴۰۵</span>
                        <div className="flex gap-6 text-xs">
                            <Link href="/terms" className="text-bone-soft hover:text-persimmon transition-colors">قوانین</Link>
                            <Link href="/privacy" className="text-bone-soft hover:text-persimmon transition-colors">حریم خصوصی</Link>
                            <Link href="/pricing" className="text-bone-soft hover:text-persimmon transition-colors">تعرفه</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterCol({
    title,
    links,
}: {
    title: string;
    links: { href: string; label: string }[];
}) {
    return (
        <div>
            <div className="text-sm font-bold text-bone mb-3">{title}</div>
            <ul className="space-y-2 text-sm">
                {links.map((l) => (
                    <li key={l.href}>
                        <Link
                            href={l.href}
                            className="text-bone-soft hover:text-persimmon transition-all hover:-translate-x-0.5 inline-flex items-center gap-1"
                        >
                            <span className="opacity-0 group-hover:opacity-100">→</span>
                            {l.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
