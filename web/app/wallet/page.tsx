"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Wallet as WalletIcon } from "lucide-react";
import { ChatBubble } from "@/components/chat";
import { CountUp, MagneticHover, ScrollReveal, StaggerChildren } from "@/lib/motion";
import { BreadcrumbLD } from "@/components/schema-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

type Lookup = {
    id: number;
    query: string;
    success: boolean;
    country?: string | null;
    numbers?: string[] | null;
    error?: string | null;
    cost_toman: number;
    created_at: string;
    from_cache?: number;
};

type Me = {
    email?: string;
    balance_toman?: number;
    price_per_lookup_toman?: number;
};

function fmt(n: number | undefined | null) {
    if (n == null) return "—";
    return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}

function fmtTime(s: string) {
    return new Intl.DateTimeFormat("fa-IR", {
        hour: "2-digit", minute: "2-digit",
    }).format(new Date(s));
}

function fmtDateShort(s: string) {
    return new Intl.DateTimeFormat("fa-IR", {
        month: "short", day: "numeric",
    }).format(new Date(s));
}

export default function WalletPage() {
    const [me, setMe] = useState<Me | null>(null);
    const [lookups, setLookups] = useState<Lookup[]>([]);
    const [authChecked, setAuthChecked] = useState(false);
    const [filter, setFilter] = useState<"all" | "ok" | "fail">("all");

    useEffect(() => {
        fetch("/api/me", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => setMe(j))
            .finally(() => setAuthChecked(true));
        fetch("/api/lookups", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => setLookups(j?.lookups ?? []));
    }, []);

    if (authChecked && !me?.email) {
        return (
            <main className="mx-auto max-w-md px-4 py-20">
                <div className="t-card t-card-pad-lg text-center">
                    <h1 className="display-fa text-2xl text-bone mb-2">ابتدا وارد شو.</h1>
                    <p className="text-sm text-bone-soft mb-6">برای دیدنِ کیف پولت باید وارد حسابت شوی.</p>
                    <Link href="/login" className="t-btn t-btn-primary w-full">
                        ورود
                        <ArrowLeft className="size-4" />
                    </Link>
                </div>
            </main>
        );
    }

    const filtered = lookups.filter((l) => filter === "ok" ? l.success : filter === "fail" ? !l.success : true);
    const totalSpent = lookups.reduce((s, l) => s + (l.cost_toman || 0), 0);
    const okCount = lookups.filter((l) => l.success).length;
    const successRatio = lookups.length === 0 ? 0 : Math.round((okCount / lookups.length) * 100);
    const lookupsLeft =
        me?.balance_toman && me?.price_per_lookup_toman
            ? Math.floor(me.balance_toman / me.price_per_lookup_toman)
            : 0;

    return (
        <main className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-20 lg:px-8">
            <BreadcrumbLD
                siteUrl={SITE_URL}
                items={[
                    { name: "خانه", url: SITE_URL + "/" },
                    { name: "کیف پول", url: SITE_URL + "/wallet" },
                ]}
            />
            <div className="pointer-events-none absolute -top-12 -inset-e-24 size-72 rounded-full bg-persimmon/15 blur-3xl blob-drift" aria-hidden />

            {/* Balance hero */}
            <ScrollReveal as="header" className="mb-7">
                <span className="t-chip t-chip-brand mb-4">
                    <span className="dot-live" />
                    کیف پول
                </span>
                <div className="flex items-baseline gap-3 flex-wrap">
                    <h1 className="display-fa text-5xl sm:text-6xl text-bone leading-none">
                        {me ? <CountUp to={me.balance_toman ?? 0} /> : "—"}
                    </h1>
                    <span className="display-fa text-2xl text-persimmon-deep">تومان</span>
                    <span className="dot-live" />
                </div>
                <p className="mt-3 text-bone-soft text-sm leading-loose">
                    تقریباً{" "}
                    <span className="font-bold text-bone font-mono">{fmt(lookupsLeft)}</span>{" "}
                    جست‌و‌جوی موفقِ دیگر در ظرفیتت.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <MagneticHover>
                        <Link href="/topup" className="t-btn t-btn-primary t-btn-lg">
                            <WalletIcon className="size-4" />
                            شارژ کیف پول
                        </Link>
                    </MagneticHover>
                    <Link href="/lookup" className="t-btn t-btn-ghost">
                        <Search className="size-4" />
                        جست‌و‌جوی تازه
                    </Link>
                </div>
            </ScrollReveal>

            {/* Stats */}
            <StaggerChildren className="grid grid-cols-3 gap-3 mb-8" stagger={0.06}>
                <Stat label="کل جست‌و‌جو" value={<CountUp to={lookups.length} />} />
                <Stat label="نرخ موفقیت" value={<><CountUp to={successRatio} />٪</>} />
                <Stat label="کل مصرف · ت" value={<CountUp to={totalSpent} />} />
            </StaggerChildren>

            {/* History */}
            <section>
                <div className="mb-4 flex items-end justify-between flex-wrap gap-3 px-1">
                    <h2 className="display-fa text-lg text-bone">تاریخچهٔ جست‌و‌جو</h2>
                    <div className="flex gap-1 text-xs">
                        <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>همه</FilterTab>
                        <FilterTab active={filter === "ok"} onClick={() => setFilter("ok")}>موفق</FilterTab>
                        <FilterTab active={filter === "fail"} onClick={() => setFilter("fail")}>ناموفق</FilterTab>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="t-card t-card-pad text-center text-bone-soft">
                        {lookups.length === 0 ? "هنوز جست‌و‌جویی انجام نداده‌ای." : "نتیجه‌ای با این فیلتر نیست."}
                    </div>
                ) : (
                    <StaggerChildren className="space-y-4" stagger={0.05}>
                        {filtered.map((l) => (
                            <div key={l.id} className="space-y-2">
                                <ChatBubble side="me" tone="brand" ticks="read" timestamp={fmtTime(l.created_at)}>
                                    <span dir="ltr" className="font-mono">{l.query}</span>
                                </ChatBubble>
                                {l.success ? (
                                    <ChatBubble
                                        side="them"
                                        tone="brand"
                                        timestamp={fmtTime(l.created_at)}
                                        meta={
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="size-1.5 rounded-full bg-jade" />
                                                یافت شد
                                                {l.country ? <span className="text-bone-dim">· {l.country}</span> : null}
                                                {l.from_cache ? (
                                                    <span className="text-[10px] font-bold text-persimmon-deep ms-1">از کش</span>
                                                ) : null}
                                            </span>
                                        }
                                    >
                                        <div className="space-y-1">
                                            {l.numbers && l.numbers.length > 0 ? (
                                                l.numbers.map((n) => (
                                                    <div
                                                        key={n}
                                                        dir="ltr"
                                                        className="font-mono font-extrabold text-base tracking-wider"
                                                    >
                                                        {n}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="font-mono text-sm">FOUND</span>
                                            )}
                                        </div>
                                        <div className="mt-1.5 text-[10px] opacity-85">
                                            <span>هزینه: </span>
                                            <span className="font-mono">{fmt(l.cost_toman)} ت</span>
                                            <span className="opacity-60"> · {fmtDateShort(l.created_at)}</span>
                                        </div>
                                    </ChatBubble>
                                ) : (
                                    <ChatBubble side="them" tone="muted" timestamp={fmtTime(l.created_at)}>
                                        <div className="text-sm">در دیتابیس نیست</div>
                                        <div className="text-[10px] text-bone-dim mt-1">
                                            ۰ تومان · رایگان · {fmtDateShort(l.created_at)}
                                        </div>
                                    </ChatBubble>
                                )}
                            </div>
                        ))}
                    </StaggerChildren>
                )}
            </section>
        </main>
    );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="t-card t-card-pad">
            <div className="text-[10px] text-bone-dim mb-1">{label}</div>
            <div className="display-fa text-2xl text-bone">{value}</div>
        </div>
    );
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${active ? "bg-persimmon text-white" : "text-bone-dim hover:text-bone"}`}
        >
            {children}
        </button>
    );
}
