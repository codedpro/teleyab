"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Gift, Share2 } from "lucide-react";
import { ChatBubble, ChatShell } from "@/components/chat";
import { CountUp, ScrollReveal, StaggerChildren } from "@/lib/motion";
import { BreadcrumbLD } from "@/components/schema-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

type Ref = {
    code: string;
    invited_count: number;
    earned_toman: number;
    bonus_toman: number;
    share_url: string;
};

function fmt(n: number) { return new Intl.NumberFormat("fa-IR").format(Math.round(n)); }

export default function ReferralPage() {
    const [r, setR] = useState<Ref | null>(null);
    const [authed, setAuthed] = useState<boolean | null>(null);
    const [copied, setCopied] = useState<"code" | "link" | null>(null);

    useEffect(() => {
        fetch("/api/me", { cache: "no-store" }).then((res) => setAuthed(res.ok));
        fetch("/api/me/referral", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then(setR);
    }, []);

    function copy(text: string, kind: "code" | "link") {
        navigator.clipboard.writeText(text);
        setCopied(kind);
        setTimeout(() => setCopied(null), 1500);
    }

    if (authed === false) {
        return (
            <main className="mx-auto max-w-md px-4 py-20">
                <div className="t-card t-card-pad-lg text-center">
                    <h1 className="display-fa text-2xl text-bone mb-2">ابتدا وارد شو.</h1>
                    <p className="text-sm text-bone-soft mb-6">برای دیدنِ کدِ دعوتت باید وارد حسابت شوی.</p>
                    <Link href="/login" className="t-btn t-btn-primary w-full">
                        ورود
                        <ArrowLeft className="size-4" />
                    </Link>
                </div>
            </main>
        );
    }

    const inviteMsg = r
        ? `سلام! با کدِ من تو TeleYab ثبت‌نام کن — هر دو ${fmt(r.bonus_toman)} تومان هدیه می‌گیریم.\n${r.share_url}`
        : "";

    return (
        <main className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-20 lg:px-8">
            <BreadcrumbLD
                siteUrl={SITE_URL}
                items={[
                    { name: "خانه", url: SITE_URL + "/" },
                    { name: "دعوت", url: SITE_URL + "/referral" },
                ]}
            />
            <div className="pointer-events-none absolute -top-12 -inset-e-24 size-72 rounded-full bg-persimmon/15 blur-3xl blob-drift" aria-hidden />

            <ScrollReveal as="header" className="mb-7">
                <span className="t-chip t-chip-brand mb-4">
                    <Gift className="size-3.5" />
                    دعوت کن، هدیه بگیر
                </span>
                <h1 className="display-fa text-3xl sm:text-4xl text-bone leading-tight">
                    بده، <span className="text-persimmon">بگیر.</span>
                </h1>
                <p className="mt-3 text-bone-soft text-sm leading-loose">
                    دوستت با کدِ تو ثبت‌نام می‌کند، کیف پولش را اولین‌بار شارژ می‌کند، و هر دوی شما{" "}
                    <span className="font-bold text-persimmon-deep font-mono">
                        {r ? fmt(r.bonus_toman) : "—"}
                    </span>{" "}
                    تومان هدیه می‌گیرید.
                </p>
            </ScrollReveal>

            {/* Invite chat shell */}
            <ScrollReveal className="mb-6">
                <ChatShell
                    title="پیامِ دعوت"
                    subtitle={r ? `کدِ تو: ${r.code}` : "در حالِ بارگذاری"}
                    avatar={<Share2 className="size-4" />}
                    footer={
                        <>
                            <span>پیامت آماده است</span>
                            <span dir="ltr" className="font-mono font-bold text-persimmon-deep">
                                {r?.code || "—"}
                            </span>
                        </>
                    }
                >
                    <div className="space-y-3 min-h-45">
                        <ChatBubble side="them" tone="muted" timestamp="حالا">
                            یک پیامِ آماده برایت ساختیم — برای دوستت بفرست.
                        </ChatBubble>
                        <ChatBubble side="me" tone="brand" ticks="read" timestamp="حالا">
                            <div className="whitespace-pre-line text-[0.92rem]">
                                {r
                                    ? `سلام! با کدِ من تو TeleYab ثبت‌نام کن — هر دو ${fmt(r.bonus_toman)} تومان هدیه می‌گیریم.`
                                    : "…"}
                            </div>
                            {r?.share_url ? (
                                <div className="mt-1.5 text-[0.8rem] opacity-90">
                                    <span dir="ltr" className="font-mono break-all">{r.share_url}</span>
                                </div>
                            ) : null}
                        </ChatBubble>
                        {copied === "link" && (
                            <ChatBubble side="them" tone="success" timestamp="حالا">
                                کپی شد!
                            </ChatBubble>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => r?.share_url && copy(r.share_url, "link")}
                            className="t-btn t-btn-primary"
                            disabled={!r?.share_url}
                        >
                            <Copy className="size-4" />
                            {copied === "link" ? "کپی شد!" : "کپی لینک"}
                        </button>
                        <button
                            onClick={() => r?.code && copy(r.code, "code")}
                            className="t-btn t-btn-ghost"
                            disabled={!r?.code}
                        >
                            <Copy className="size-4" />
                            {copied === "code" ? "کد کپی شد!" : `کپی کد · ${r?.code || "—"}`}
                        </button>
                        {typeof navigator !== "undefined" && "share" in navigator && r?.share_url ? (
                            <button
                                onClick={() => navigator.share?.({ text: inviteMsg, url: r.share_url })}
                                className="t-btn t-btn-ghost"
                            >
                                <Share2 className="size-4" />
                                اشتراک
                            </button>
                        ) : null}
                    </div>
                </ChatShell>
            </ScrollReveal>

            {/* Stats */}
            <StaggerChildren className="grid grid-cols-2 gap-3 mb-10" stagger={0.08}>
                <div className="t-card t-card-pad">
                    <div className="text-[11px] text-bone-dim mb-1.5">دوستانِ پیوسته</div>
                    <div className="display-fa text-3xl text-bone">
                        {r ? <CountUp to={r.invited_count} /> : "—"}
                    </div>
                </div>
                <div className="t-card t-card-pad">
                    <div className="text-[11px] text-bone-dim mb-1.5">هدیهٔ دریافتی · تومان</div>
                    <div className="display-fa text-3xl text-persimmon-deep">
                        {r ? <CountUp to={r.earned_toman} /> : "—"}
                    </div>
                </div>
            </StaggerChildren>

            {/* Rules */}
            <ScrollReveal>
                <h2 className="display-fa text-lg text-bone mb-3 px-1">قوانینِ برنامه</h2>
                <StaggerChildren className="space-y-2.5" stagger={0.05}>
                    <Rule kicker="۱" body="دوستت باید با لینک یا کدِ تو ثبت‌نام کند." />
                    <Rule kicker="۲" body="هدیه پس از اولین شارژِ تأییدشدهٔ دوست واریز می‌شود — یک تراکنشِ تأیید‌شدهٔ کارت‌به‌کارت کافی است." />
                    <Rule kicker="۳" body="هدیه برای هر دو طرف به‌صورتِ همزمان به کیف پول اضافه می‌شود." />
                    <Rule kicker="۴" body="هر کاربر فقط یک‌بار می‌تواند با کد دعوت ثبت‌نام کند." />
                </StaggerChildren>
            </ScrollReveal>
        </main>
    );
}

function Rule({ kicker, body }: { kicker: string; body: string }) {
    return (
        <div className="t-card t-card-pad flex items-start gap-3">
            <span className="size-7 rounded-full bg-persimmon-soft text-persimmon-deep grid place-items-center font-bold text-sm shrink-0">
                {kicker}
            </span>
            <p className="text-bone-soft text-sm leading-loose pt-0.5">{body}</p>
        </div>
    );
}
