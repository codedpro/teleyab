import Link from "next/link";
import { ArrowUpLeft, Search } from "lucide-react";
import { ScrollReveal, MagneticHover } from "@/lib/motion";
import { ChatShell, ChatBubble } from "@/components/chat";

export default function NotFound() {
    return (
        <main className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-16 pb-24 lg:px-8 overflow-hidden">
            <div
                aria-hidden
                className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-persimmon-soft blur-3xl blob-drift"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute top-1/2 -start-32 size-64 rounded-full bg-persimmon-soft/50 blur-3xl blob-drift"
                style={{ animationDelay: "3.5s" }}
            />

            <ScrollReveal className="relative mb-8 text-center">
                <span className="t-chip t-chip-muted mb-3">۴۰۴</span>
                <h1 className="display-fa text-3xl sm:text-4xl text-bone leading-tight">
                    این جست‌و‌جو <span className="text-persimmon">نتیجه نداشت.</span>
                </h1>
            </ScrollReveal>

            <ScrollReveal className="relative" y={20} delay={0.1}>
                <ChatShell subtitle="خطا · ۴۰۴">
                    <div className="space-y-3 min-h-[180px]">
                        <ChatBubble side="me" tone="brand" ticks="read" timestamp="حالا">
                            <span dir="ltr" className="font-mono text-[0.95rem]">
                                @missing_handle
                            </span>
                        </ChatBubble>

                        <ChatBubble side="them" tone="muted" timestamp="حالا">
                            <div className="text-[11px] text-bone-dim mb-1">پاسخِ TeleYab</div>
                            <div className="leading-loose">
                                این یوزرنیم در دیتابیسِ ما پیدا نشد. می‌خواهی یک یوزرنیمِ دیگر را امتحان کنی، یا به خانه برگردی؟
                            </div>
                        </ChatBubble>
                    </div>
                </ChatShell>
            </ScrollReveal>

            <ScrollReveal className="relative mt-8 flex flex-wrap items-center justify-center gap-4" y={14} delay={0.2}>
                <MagneticHover>
                    <Link href="/lookup" className="t-btn t-btn-primary t-btn-lg group inline-flex items-center gap-3">
                        <Search className="size-4" />
                        <span>جست‌و‌جوی شماره</span>
                    </Link>
                </MagneticHover>
                <Link href="/" className="t-btn t-btn-ghost group inline-flex items-center gap-2">
                    <ArrowUpLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                    <span>بازگشت به خانه</span>
                </Link>
            </ScrollReveal>
        </main>
    );
}
