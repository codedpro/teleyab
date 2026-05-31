"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ChatBubble, ChatStream, TypingDots } from "@/components/chat";
import { ScrollReveal, ParallaxBlob } from "@/lib/motion";

export function AuthFrame({
    eyebrow,
    title,
    titleEn,
    epigraph,
    epigraphAttr,
    children,
    footer,
}: {
    eyebrow: string;
    title: string;
    titleEn?: string;
    epigraph?: string;
    epigraphAttr?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <div className="relative overflow-hidden">
            {/* Animated backdrop blobs */}
            <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
                <ParallaxBlob
                    className="absolute -top-32 -end-32 size-[420px] rounded-full bg-persimmon-soft blur-3xl blob-drift"
                    speed={0.2}
                />
                <ParallaxBlob
                    className="absolute -bottom-40 -start-24 size-[320px] rounded-full bg-saffron/15 blur-3xl blob-drift"
                    speed={0.35}
                />
            </div>

            <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-y-10 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:pt-16">
                {/* Brand / pitch column — visible lg+ only */}
                <aside className="hidden lg:col-span-6 lg:flex lg:flex-col lg:justify-between lg:py-8">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-3 group">
                            <span className="relative inline-flex">
                                <Logo size={40} />
                                <span
                                    className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full bg-jade ring-2 ring-white"
                                    aria-hidden
                                />
                            </span>
                            <span className="text-3xl font-extrabold tracking-tight text-bone group-hover:text-persimmon transition-colors">
                                TeleYab
                            </span>
                        </Link>

                        <span className="mt-12 inline-flex items-center gap-2 t-chip t-chip-brand">
                            <span className="dot-live" />
                            {eyebrow}
                        </span>

                        <h1 className="display-fa mt-5 text-balance text-5xl text-bone xl:text-6xl reveal reveal-1">
                            {title}
                            {titleEn ? (
                                <>
                                    <br />
                                    <span className="text-persimmon">{titleEn}</span>
                                </>
                            ) : null}
                        </h1>

                        {/* Mini chat preview — a soft visual reminder of what the product does */}
                        <ScrollReveal className="mt-10 max-w-md">
                            <div className="t-card overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-rule-soft bg-persimmon-soft/40 flex items-center gap-2.5">
                                    <div className="size-7 rounded-full bg-persimmon text-white grid place-items-center font-extrabold text-xs">
                                        T
                                    </div>
                                    <div className="text-xs font-bold text-bone">TeleYab · آنلاین</div>
                                </div>
                                <div className="bg-tg-paper px-4 py-4">
                                    <ChatStream interval={0.4}>
                                        <ChatBubble side="me" tone="brand" ticks="read" timestamp="۲۰:۱۲">
                                            <span dir="ltr" className="font-mono text-[13px]">@arman_dev</span>
                                        </ChatBubble>
                                        <TypingDots />
                                        <ChatBubble
                                            side="them"
                                            timestamp="۲۰:۱۲"
                                            meta={
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="size-1.5 rounded-full bg-jade" /> یافت شد
                                                </span>
                                            }
                                        >
                                            <div dir="ltr" className="font-mono font-extrabold text-persimmon-deep text-[14px]">
                                                +98 912 *** 4521
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-bone">آرمان دهقانی</div>
                                        </ChatBubble>
                                    </ChatStream>
                                </div>
                            </div>
                        </ScrollReveal>

                        {epigraph ? (
                            <blockquote className="mt-8 max-w-md t-card t-card-pad bg-persimmon-soft border-0">
                                <p className="text-base leading-loose text-persimmon-deep">«{epigraph}»</p>
                                {epigraphAttr ? (
                                    <footer className="mt-3 text-xs text-persimmon-deep/80">— {epigraphAttr}</footer>
                                ) : null}
                            </blockquote>
                        ) : null}
                    </div>

                    <div className="mt-12 flex items-center gap-3 border-t border-rule-soft pt-5">
                        <span className="dot-live" />
                        <span className="text-xs text-bone-dim">
                            پایگاه دادهٔ بزرگِ تلگرام · فقط برای نتیجهٔ موفق پرداخت می‌کنی
                        </span>
                    </div>
                </aside>

                {/* Form column — clean rounded card */}
                <main className="lg:col-span-6 min-w-0">
                    <div className="relative">
                        <div
                            aria-hidden
                            className="absolute -inset-6 -z-10 rounded-[32px] bg-persimmon/8 blur-3xl glow-pulse"
                        />
                        <div className="t-card t-card-pad-lg sm:p-12 reveal reveal-1">
                            {/* mobile-only brand strip inside the card */}
                            <div className="lg:hidden mb-6 flex items-center justify-between border-b border-rule-soft pb-4">
                                <Link href="/" className="inline-flex items-center gap-2">
                                    <Logo size={22} />
                                    <span className="text-base font-extrabold text-bone">TeleYab</span>
                                </Link>
                                <span className="t-chip t-chip-brand">{eyebrow}</span>
                            </div>

                            {children}

                            {footer ? (
                                <div className="mt-10 border-t border-rule-soft pt-6 text-sm text-bone-soft">
                                    {footer}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
