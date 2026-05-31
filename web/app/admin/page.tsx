"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { ScrollReveal, StaggerChildren, CountUp } from "@/lib/motion";

type Stats = {
    user_count?: number;
    active_users_7d?: number;
    lookup_count?: number;
    successful_lookups?: number;
    revenue_toman?: number;
    total_topped_toman?: number;
    held_balance_toman?: number;
    flagged_users?: number;
    banned_users?: number;
    pending_refunds?: number;
    pending_payments?: number;
};

type Me = { email?: string; role?: string };

type ProviderBalance = {
    provider: string;
    tokens_remaining?: number;
    error?: string;
};

function fmt(n: number | undefined | null) {
    return new Intl.NumberFormat("fa-IR").format(Math.round(n ?? 0));
}

export default function AdminPage() {
    const [me, setMe] = useState<Me | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);
    const [providers, setProviders] = useState<ProviderBalance[] | null>(null);

    useEffect(() => {
        fetch("/api/me", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then(setMe)
            .finally(() => setAuthChecked(true));
    }, []);

    useEffect(() => {
        if (me?.role !== "admin") return;
        fetch("/api/admin/stats").then((r) => (r.ok ? r.json() : null)).then(setStats);
        fetch("/api/admin/upstream-balance")
            .then(async (r) => {
                const j = await r.json().catch(() => null);
                setProviders(j?.providers ?? []);
            })
            .catch(() => setProviders([]));
    }, [me]);

    if (authChecked && me?.role !== "admin") {
        return (
            <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-24 lg:px-12">
                <ScrollReveal className="t-card t-card-pad-lg text-center">
                    <span className="t-chip t-chip-danger mb-3 inline-flex">
                        <span className="dot-live" />
                        دسترسی محدود
                    </span>
                    <h1 className="display-fa mt-3 text-4xl text-bone">دسترسی محدود.</h1>
                    <p className="mt-3 text-bone-soft">این بخش فقط برای ادمین‌هاست.</p>
                    <Link href="/" className="t-btn t-btn-ghost mt-8 inline-flex">
                        ← بازگشت به خانه
                    </Link>
                </ScrollReveal>
            </main>
        );
    }

    return (
        <main className="relative">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
                <ScrollReveal className="py-8" y={16}>
                    <span className="t-chip t-chip-brand mb-3 inline-flex">
                        <span className="dot-live" />
                        CONTROL ROOM
                    </span>
                    <h1 className="display-fa mt-3 text-4xl text-bone md:text-5xl">داشبورد ادمین.</h1>
                    <p className="mt-2 text-bone-soft text-sm">نمای کلی · KPI · صف‌ها · تامین‌کنندگان</p>
                </ScrollReveal>

                {/* KPIs */}
                <ScrollReveal className="py-6">
                    <StaggerChildren className="grid grid-cols-2 gap-3 md:grid-cols-4" stagger={0.06}>
                        <Kpi label="USERS" value={stats?.user_count ?? 0} sub={`${fmt(stats?.active_users_7d)} active · 7d`} />
                        <Kpi label="LOOKUPS · OK" value={stats?.successful_lookups ?? 0} sub={`of ${fmt(stats?.lookup_count)} total`} />
                        <Kpi label="REVENUE" value={stats?.revenue_toman ?? 0} sub={`T · spent`} />
                        <Kpi label="WALLETS HELD" value={stats?.held_balance_toman ?? 0} sub={`T · owed to users`} />
                    </StaggerChildren>
                </ScrollReveal>

                {/* Alerts */}
                <ScrollReveal className="py-6">
                    <StaggerChildren className="grid gap-3 sm:grid-cols-2 md:grid-cols-4" stagger={0.06}>
                        <Alert href="/admin/payments" label="PENDING PAYMENTS" value={stats?.pending_payments ?? 0} hot={(stats?.pending_payments ?? 0) > 0} />
                        <Alert href="/admin/refunds" label="REFUND QUEUE" value={stats?.pending_refunds ?? 0} hot={(stats?.pending_refunds ?? 0) > 0} />
                        <Alert href="/admin/flags" label="FLAGGED USERS" value={stats?.flagged_users ?? 0} hot={(stats?.flagged_users ?? 0) > 0} />
                        <Alert href="/admin/users" label="BANNED USERS" value={stats?.banned_users ?? 0} hot={(stats?.banned_users ?? 0) > 0} kind="danger" />
                    </StaggerChildren>
                </ScrollReveal>

                {/* Quick links */}
                <ScrollReveal className="py-8">
                    <div className="mb-6">
                        <span className="t-chip t-chip-muted mb-3 inline-flex">DESKS</span>
                        <h2 className="display-fa text-3xl text-bone">میزها.</h2>
                    </div>
                    <StaggerChildren className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
                        <Desk href="/admin/settings" code="01" title="تنظیمات" desc="قیمت، سقف، کش، اپراتور" />
                        <Desk href="/admin/users" code="02" title="کاربران" desc="مشاهده، بن، تنظیم موجودی" />
                        <Desk href="/admin/payments" code="03" title="پرداخت‌ها" desc="شارژِ کیف‌پول · تأیید / رد" />
                        <Desk href="/admin/refunds" code="04" title="بازپرداخت‌ها" desc="صفِ بازپرداخت · رسیدگی" />
                        <Desk href="/admin/flags" code="05" title="گزارش‌ها" desc="کاربرانِ مشکوک · scraper" />
                        <Desk href="/admin/providers" code="06" title="تامین‌کنندگان" desc="multi-provider · failover" />
                        <Desk href="/admin/resellers" code="07" title="نمایندگان" desc="white-label · markup" />
                    </StaggerChildren>
                </ScrollReveal>

                {/* Upstream balances */}
                <ScrollReveal className="py-8">
                    <div className="mb-6 flex items-end justify-between gap-3">
                        <div>
                            <span className="t-chip t-chip-warning mb-3 inline-flex">UPSTREAM · TOKEN BALANCE</span>
                            <h2 className="display-fa mt-3 text-3xl text-bone">موجودی توکن.</h2>
                        </div>
                        <span className="hidden md:inline-flex t-chip t-chip-muted">FETCHED LIVE</span>
                    </div>
                    {providers === null ? (
                        <div className="t-card t-card-pad text-center text-bone-dim">…</div>
                    ) : providers.length === 0 ? (
                        <div className="t-card t-card-pad-lg text-center">
                            <p className="text-bone-soft">
                                هنوز تامین‌کننده‌ای پیکربندی نشده.
                                <Link href="/admin/providers" className="ms-2 text-persimmon hover:underline">افزودن →</Link>
                            </p>
                        </div>
                    ) : (
                        <StaggerChildren className="grid gap-2" stagger={0.05}>
                            {providers.map((p, i) => (
                                <div key={i} className="t-card t-card-pad lift grid grid-cols-12 items-center gap-3">
                                    <span className="col-span-1 font-mono text-[10px] text-bone-dim">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <span className="col-span-4 font-mono text-bone">{p.provider}</span>
                                    <span className="col-span-4 ltr font-mono text-persimmon" dir="ltr">
                                        {p.error ? <span className="text-rose">{p.error}</span> : `${fmt(p.tokens_remaining)} tokens`}
                                    </span>
                                    <span className="col-span-3 text-end">
                                        {p.error
                                            ? <span className="t-chip t-chip-danger">DOWN</span>
                                            : (p.tokens_remaining ?? 0) < 10
                                                ? <span className="t-chip t-chip-warning">LOW · TOP-UP</span>
                                                : <span className="t-chip t-chip-success">HEALTHY</span>}
                                    </span>
                                </div>
                            ))}
                        </StaggerChildren>
                    )}
                </ScrollReveal>

                <div className="h-12" />
            </div>
        </main>
    );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
    return (
        <div className="t-card t-card-pad lift">
            <span className="t-chip t-chip-muted">{label}</span>
            <CountUp to={value} className="display-fa mt-3 block text-4xl text-bone md:text-5xl" />
            {sub ? <span className="mt-2 block text-xs text-bone-dim ltr font-mono" dir="ltr">{sub}</span> : null}
        </div>
    );
}

function Alert({ href, label, value, hot, kind = "warn" }: { href: string; label: string; value: number; hot: boolean; kind?: "warn" | "danger" }) {
    const chipClass = hot ? (kind === "danger" ? "t-chip t-chip-danger" : "t-chip t-chip-warning") : "t-chip t-chip-muted";
    return (
        <Link href={href} className="group t-card t-card-pad lift flex items-start justify-between gap-3">
            <div className="min-w-0">
                <span className={chipClass}>{label}</span>
                <CountUp to={value} className="display-fa mt-3 block text-3xl text-bone" />
            </div>
            <ArrowUpLeft className="h-4 w-4 text-bone-dim transition-transform group-hover:-translate-x-1 group-hover:text-persimmon" />
        </Link>
    );
}

function Desk({ href, code, title, desc }: { href: string; code: string; title: string; desc: string }) {
    return (
        <Link href={href} className="group t-card t-card-pad lift flex items-start gap-4">
            <span className="font-mono text-xs text-bone-dim shrink-0">{code}</span>
            <div className="min-w-0 flex-1">
                <h3 className="display-fa text-2xl text-bone group-hover:text-persimmon">{title}</h3>
                <p className="mt-1 text-xs text-bone-dim">{desc}</p>
            </div>
            <ArrowUpLeft className="h-4 w-4 text-bone-dim transition-transform group-hover:-translate-x-1 group-hover:text-persimmon" />
        </Link>
    );
}
