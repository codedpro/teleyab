"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Wallet, Zap } from "lucide-react";
import { CountUp, MagneticHover, ScrollReveal, StaggerChildren } from "@/lib/motion";
import { ChatBubble, ChatShell, ChatStream } from "@/components/chat";
import { BreadcrumbLD } from "@/components/schema-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

type Pricing = {
    price_per_lookup_toman: number;
    min_topup_toman: number;
    max_topup_toman: number;
    referral_bonus_toman: number;
    lookup_cache_days: number;
};

// Quick-charge presets — floor is one successful lookup (800,000 T).
// Anything below is rejected by the API since `min_topup_toman` matches.
const TOPUP_PRESETS = [800_000, 2_400_000, 4_000_000, 8_000_000];

function fmt(n: number) { return new Intl.NumberFormat("fa-IR").format(Math.round(n)); }

export default function PricingPage() {
    const [p, setP] = useState<Pricing | null>(null);
    const [authed, setAuthed] = useState<boolean | null>(null);

    useEffect(() => {
        fetch("/api/public/pricing", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then(setP);
        // Determine auth state so presets route to /login first when needed.
        fetch("/api/me", { cache: "no-store" })
            .then((r) => setAuthed(r.ok))
            .catch(() => setAuthed(false));
    }, []);

    const price = p?.price_per_lookup_toman ?? 0;

    // Once auth state is known, decide where presets should land.
    // Default to the login-gated path until we've confirmed the user is
    // authenticated — that way an unauthed click never lands on /topup
    // and bounces back through auth.
    function topupHref(amount: number) {
        if (authed === true) return `/topup?amount=${amount}`;
        return `/login?next=${encodeURIComponent(`/topup?amount=${amount}`)}`;
    }

    return (
        <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-12 pb-20 lg:px-8">
            <BreadcrumbLD
                siteUrl={SITE_URL}
                items={[
                    { name: "خانه", url: SITE_URL + "/" },
                    { name: "تعرفه", url: SITE_URL + "/pricing" },
                ]}
            />
            {/* Hero */}
            <header className="text-center mb-12 relative">
                <div className="blob-drift absolute -top-12 left-1/2 -translate-x-1/2 size-80 rounded-full bg-persimmon-soft/50 blur-3xl pointer-events-none" aria-hidden />
                <ScrollReveal>
                    <span className="t-chip t-chip-brand mb-5">
                        <span className="dot-live" />
                        تعرفه · زنده
                    </span>
                </ScrollReveal>
                <ScrollReveal delay={0.05}>
                    <h1 className="display-fa text-4xl sm:text-6xl text-bone leading-[1.05]">
                        قیمت‌گذاریِ شفاف،{" "}
                        <span className="text-persimmon">بدون اشتراکِ ماهانه.</span>
                    </h1>
                </ScrollReveal>
                <ScrollReveal delay={0.15} className="relative z-10 mt-8">
                    <div className="text-xs font-bold tracking-wider text-bone-dim mb-3">
                        برای هر جست‌و‌جوی موفق
                    </div>
                    <div className="flex items-baseline justify-center gap-3">
                        {p ? (
                            <CountUp to={price} className="display-fa text-7xl sm:text-9xl text-bone leading-none" />
                        ) : (
                            <span className="display-fa text-7xl sm:text-9xl text-bone-dim leading-none">—</span>
                        )}
                        <span className="text-2xl font-bold text-persimmon">تومان</span>
                    </div>
                    <p className="mt-5 text-bone-soft text-sm">
                        اگر پیدا نشد، چیزی پرداخت نمی‌کنی.
                    </p>
                </ScrollReveal>
            </header>

            {/* Conversation illustration */}
            <ScrollReveal className="mb-12">
                <ChatShell
                    subtitle="نمونهٔ مکالمه"
                    footer={
                        <>
                            <span>یک جست‌و‌جوی موفق</span>
                            <span dir="ltr" className="font-mono font-bold text-persimmon-deep">
                                {p ? fmt(price) : "—"} ت
                            </span>
                        </>
                    }
                >
                    <ChatStream className="min-h-55">
                        <ChatBubble side="me" tone="brand" ticks="read" timestamp="20:14">
                            <span dir="ltr" className="font-mono">@arman_dev</span>
                        </ChatBubble>
                        <ChatBubble
                            side="them"
                            timestamp="20:14"
                            meta={
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="size-1.5 rounded-full bg-jade" /> یافت شد
                                </span>
                            }
                        >
                            <div className="space-y-1.5">
                                <div dir="ltr" className="font-mono font-extrabold text-base sm:text-lg tracking-wider text-persimmon-deep">
                                    +98 912 *** 4521
                                </div>
                                <div className="text-[12px] text-bone">
                                    <span className="text-bone-dim">نام:</span> آرمان دهقانی
                                </div>
                                <div dir="ltr" className="text-[12px] font-mono text-bone">
                                    <span className="text-bone-dim">email:</span> arman.d***@gmail.com
                                </div>
                                <div className="text-[11px] text-bone-soft">
                                    <span className="text-bone-dim">یوزرنیم‌های قبلی:</span>{" "}
                                    <span dir="ltr" className="font-mono">@arman_98, @armandev</span>
                                </div>
                                <div className="text-[11px] text-bone-soft">
                                    <span className="text-bone-dim">تولد:</span> ۱۳۷۲/۰۴/۱۸
                                </div>
                            </div>
                            <div className="mt-2 text-[11px] text-bone-dim border-t border-rule-soft pt-2">
                                هزینه: <span className="font-mono text-bone-soft">{p ? fmt(price) : "—"} ت</span>
                            </div>
                        </ChatBubble>
                        <ChatBubble side="me" tone="brand" ticks="read" timestamp="20:15">
                            <span dir="ltr" className="font-mono">@notarealhandle</span>
                        </ChatBubble>
                        <ChatBubble side="them" tone="muted" timestamp="20:15">
                            <div className="text-sm">در دیتابیس نیست</div>
                            <div className="text-[11px] text-bone-dim mt-1">۰ تومان · رایگان</div>
                        </ChatBubble>
                    </ChatStream>
                </ChatShell>
            </ScrollReveal>

            {/* Rules grid */}
            <section className="mb-12">
                <ScrollReveal>
                    <h2 className="display-fa text-2xl sm:text-3xl text-bone mb-5 text-center">چطور حساب می‌کنیم</h2>
                </ScrollReveal>
                <StaggerChildren className="grid gap-4 sm:grid-cols-3" stagger={0.1}>
                    <RuleCard
                        Icon={Check}
                        tone="jade"
                        title="نتیجه آمد، پرداخت می‌کنی"
                        body="فقط وقتی شماره را تحویل گرفتی، از کیف پولت کسر می‌شود."
                    />
                    <RuleCard
                        Icon={Zap}
                        tone="rose"
                        title="پیدا نشد؟ پولی کسر نمی‌شود"
                        body="اگر یوزرنیم در دیتابیس نباشد، هیچ رقمی برداشته نمی‌شود. تلاشِ بعدی هم رایگان است."
                    />
                    <RuleCard
                        Icon={Wallet}
                        tone="brand"
                        title="کیف پولِ تومانی"
                        body="یک‌بار شارژ کن، هر وقت لازم داشتی جست‌و‌جو کن. تاریخچهٔ کاملِ تراکنش‌ها در داشبورد می‌مانَد."
                    />
                </StaggerChildren>
            </section>

            {/* Topup presets */}
            <section className="mb-12">
                <ScrollReveal>
                    <div className="flex items-end justify-between mb-5 flex-wrap gap-2">
                        <h2 className="display-fa text-2xl sm:text-3xl text-bone">شارژِ سریع</h2>
                        <span className="text-xs text-bone-dim">
                            یکی را انتخاب کن، به صفحهٔ شارژ می‌رویم
                        </span>
                    </div>
                </ScrollReveal>
                <StaggerChildren className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
                    {TOPUP_PRESETS.map((amount) => {
                        const lookups = price ? Math.floor(amount / price) : 0;
                        return (
                            <Link
                                key={amount}
                                href={topupHref(amount)}
                                className="t-card t-card-pad lift group relative overflow-hidden"
                            >
                                <div className="absolute -top-8 -inset-e-8 size-24 rounded-full bg-persimmon-soft/40 blur-2xl group-hover:bg-persimmon-soft/70 transition-colors pointer-events-none" aria-hidden />
                                <div className="relative">
                                    <div className="text-xs font-bold text-bone-dim mb-1.5">شارژ</div>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="display-fa text-3xl text-bone leading-none">{fmt(amount)}</span>
                                        <span className="text-xs text-persimmon font-bold">ت</span>
                                    </div>
                                    {lookups > 0 ? (
                                        <p className="mt-3 text-xs text-bone-soft border-t border-rule-soft pt-3">
                                            معادلِ <span className="font-mono font-bold text-bone">{fmt(lookups)}</span> جست‌و‌جوی موفق
                                        </p>
                                    ) : (
                                        <p className="mt-3 text-xs text-bone-dim border-t border-rule-soft pt-3">
                                            بعد از ورود محاسبه می‌شود
                                        </p>
                                    )}
                                    {authed === false && (
                                        <p className="mt-2 text-[10px] text-persimmon-deep font-bold">
                                            ابتدا وارد شو، بعد شارژ کن
                                        </p>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </StaggerChildren>
            </section>

            {/* Wallet meta */}
            <ScrollReveal className="t-card t-card-pad mb-12">
                <h2 className="font-extrabold text-bone text-lg mb-4">جزئیاتِ کیف پول</h2>
                <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <Row label="حداقل شارژ" value={p ? `${fmt(p.min_topup_toman)} تومان` : "—"} />
                    <Row label="حداکثر شارژ" value={p ? `${fmt(p.max_topup_toman)} تومان` : "—"} />
                    <Row label="هدیهٔ دعوت" value={p ? `${fmt(p.referral_bonus_toman)} تومان برای هر طرف` : "—"} />
                    <Row label="ارز" value="تومان" />
                </dl>
            </ScrollReveal>

            {/* FAQ */}
            <ScrollReveal className="t-card divide-y divide-rule-soft mb-12">
                <Faq q="لوک‌آپ چیست؟" a="یوزرنیمِ تلگرامی (مثل @username) یا آی‌دیِ عددی را می‌فرستی. ما شمارهٔ موبایلِ متصل به آن حساب را برمی‌گردانیم — حتی اگر توسطِ کاربر مخفی شده باشد." />
                <Faq q="نرخِ موفقیت چقدر است؟" a="حدودِ ۸۰ تا ۸۵ درصد. موفقیت به عواملی از جمله قدمتِ حساب بستگی دارد — حساب‌های قدیمی‌تر احتمالِ بیشتری دارند که اطلاعاتشان در دیتابیسِ ما موجود باشد." />
                <Faq q="جست‌و‌جو چقدر طول می‌کشد؟" a="بینِ ۱ تا ۱۵ ثانیه متغیر است. نتیجه بلافاصله در همین صفحه نمایش داده می‌شود." />
                <Faq q="اگر جست‌و‌جو ناموفق بود چه؟" a="اگر هیچ اطلاعاتی پیدا نشود، هیچ هزینه‌ای از کیف‌پولت کسر نمی‌شود. ما فقط برای نتایجِ موفق پرداخت می‌گیریم." />
                <Faq q="آیا اشتراکِ ماهانه دارید؟" a="خیر. کاملاً مصرفی است. وقتی شارژ می‌کنی، پولت در کیف پولت می‌ماند و فقط بابتِ نتایجِ موفق کسر می‌شود." />
                <Faq q="API دارید؟" a="بله. در داشبوردِ کلیدها یک Bearer token می‌سازی و از endpoint /api/v1/lookup استفاده می‌کنی. صورت‌حساب همان کیف پولِ تومانیِ توست." />
            </ScrollReveal>

            {/* Closing CTA */}
            <ScrollReveal className="text-center">
                <div className="t-card t-card-pad-lg relative overflow-hidden">
                    <div className="blob-drift absolute -bottom-20 -inset-s-12 size-64 rounded-full bg-persimmon-soft/40 blur-3xl pointer-events-none" aria-hidden />
                    <div className="relative">
                        <h2 className="display-fa text-3xl sm:text-4xl text-bone mb-3">آماده‌ای؟</h2>
                        <p className="text-bone-soft text-sm mb-6 max-w-md mx-auto">
                            یک حساب باز کن، کیف پولت را شارژ کن، اولین یوزرنیم را بفرست.
                        </p>
                        <MagneticHover>
                            <Link
                                href={authed === true ? "/lookup" : "/login?next=/lookup"}
                                className="t-btn t-btn-primary t-btn-lg"
                            >
                                {authed === true ? "شروعِ جست‌و‌جو" : "ساختِ حساب"}
                                <ArrowLeft className="size-4" />
                            </Link>
                        </MagneticHover>
                    </div>
                </div>
            </ScrollReveal>
        </main>
    );
}

function RuleCard({
    Icon,
    tone,
    title,
    body,
}: {
    Icon: React.ComponentType<{ className?: string }>;
    tone: "jade" | "rose" | "brand";
    title: string;
    body: string;
}) {
    const palette =
        tone === "jade"
            ? "bg-jade/15 text-jade"
            : tone === "rose"
            ? "bg-rose/15 text-rose"
            : "bg-persimmon-soft text-persimmon-deep";
    return (
        <div className="t-card t-card-pad lift">
            <div className={`size-10 rounded-full ${palette} flex items-center justify-center mb-3`}>
                <Icon className="size-5" />
            </div>
            <h3 className="font-bold text-bone mb-1">{title}</h3>
            <p className="text-sm text-bone-soft leading-loose">{body}</p>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between border-b border-rule-soft pb-3 last:border-0 last:pb-0">
            <dt className="text-bone-dim">{label}</dt>
            <dd className="font-bold text-bone">{value}</dd>
        </div>
    );
}

function Faq({ q, a }: { q: string; a: string }) {
    return (
        <details className="group p-5 sm:p-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer flex items-center justify-between gap-4 font-bold text-bone">
                <span>{q}</span>
                <span className="text-persimmon shrink-0 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
            </summary>
            <p className="mt-3 text-bone-soft leading-loose text-sm">{a}</p>
        </details>
    );
}
