"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";
import { ScrollReveal, MagneticHover } from "@/lib/motion";
import { ChatShell, ChatBubble } from "@/components/chat";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-16 pb-24 lg:px-8 overflow-hidden">
            <div
                aria-hidden
                className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-rose/20 blur-3xl blob-drift glow-pulse"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute top-1/2 -start-32 size-64 rounded-full bg-rose/15 blur-3xl blob-drift"
                style={{ animationDelay: "3s" }}
            />

            <ScrollReveal className="relative mb-8 text-center">
                <span className="t-chip t-chip-danger mb-3">خطا</span>
                <h1 className="display-fa text-3xl sm:text-4xl text-bone leading-tight">
                    یک <span className="text-persimmon">اتفاقِ غیرمنتظره.</span>
                </h1>
            </ScrollReveal>

            <ScrollReveal className="relative" y={20} delay={0.1}>
                <ChatShell subtitle="خطا · در حالِ بررسی">
                    <div className="space-y-3 min-h-[180px]">
                        <ChatBubble side="them" tone="danger" timestamp="حالا">
                            <div className="text-[11px] opacity-80 mb-1">پاسخِ TeleYab</div>
                            <div className="leading-loose">
                                اتفاق پیش می‌آید. می‌توانی تلاش دوباره کنی یا به خانه برگردی.
                                اگر تکرار شد، با همان ایمیلِ حساب به ما بگو.
                            </div>
                            {error.message && (
                                <div
                                    dir="ltr"
                                    className="mt-3 font-mono text-[11px] opacity-80 leading-relaxed break-all"
                                >
                                    {error.message}
                                </div>
                            )}
                        </ChatBubble>

                        {error.digest && (
                            <ChatBubble side="them" tone="muted" timestamp="حالا" tail={false}>
                                <span dir="ltr" className="font-mono text-[11px]">
                                    digest · {error.digest}
                                </span>
                            </ChatBubble>
                        )}
                    </div>
                </ChatShell>
            </ScrollReveal>

            <ScrollReveal className="relative mt-8 flex flex-wrap items-center justify-center gap-4" y={14} delay={0.2}>
                <MagneticHover>
                    <button
                        type="button"
                        onClick={reset}
                        className="t-btn t-btn-primary t-btn-lg group inline-flex items-center gap-3"
                    >
                        <RotateCcw className="size-4 transition-transform group-hover:-rotate-45" />
                        <span>تلاش دوباره</span>
                    </button>
                </MagneticHover>
                <Link href="/" className="t-btn t-btn-ghost inline-flex items-center gap-2">
                    <Home className="size-4" />
                    <span>بازگشت به خانه</span>
                </Link>
            </ScrollReveal>
        </main>
    );
}
