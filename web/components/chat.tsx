"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CheckCheck } from "lucide-react";
import { loadGsap, prefersReducedMotion, useGsap, Typewriter } from "@/lib/motion";

/* ───────────────── ChatBubble ─────────────────
   A Telegram-flavoured bubble.  Side, tone, optional tail, optional
   "ticks" for the read state.  Animates in via the parent ChatStream.
*/
export function ChatBubble({
    side = "them",
    tone = "neutral",
    tail = true,
    ticks,
    meta,
    timestamp,
    children,
    className = "",
}: {
    side?: "me" | "them";
    tone?: "neutral" | "brand" | "muted" | "success" | "danger";
    tail?: boolean;
    ticks?: "single" | "double" | "read";
    meta?: ReactNode;
    timestamp?: string;
    children: ReactNode;
    className?: string;
}) {
    const isMe = side === "me";
    // RTL layout: user (me) sits on the visual RIGHT, bot (them) on the LEFT.
    // In a dir="rtl" flex row: justify-start = right, justify-end = left.
    const base =
        "chat-bubble relative max-w-[86%] rounded-2xl px-3.5 py-2.5 leading-relaxed text-sm sm:text-[0.95rem]";
    const palette =
        tone === "brand" || (tone === "neutral" && isMe)
            ? "bg-persimmon text-white"
            : tone === "muted"
            ? "bg-night-700 text-bone-soft border border-rule-soft"
            : tone === "success"
            ? "bg-jade/10 text-[#15803d] border border-jade/25"
            : tone === "danger"
            ? "bg-rose/10 text-rose border border-rose/25"
            : "bg-white border border-rule";
    // Tail / flat-corner sits on the side closest to its owner.
    const tailCls =
        tail && isMe
            ? "rounded-br-md"
            : tail && !isMe
            ? "rounded-bl-md"
            : "";
    const wrap = isMe ? "me-auto" : "ms-auto";
    return (
        <div className={`flex ${isMe ? "justify-start" : "justify-end"} ${className}`}>
            <div className={`${base} ${palette} ${tailCls} ${wrap}`}>
                {meta && <div className="text-[11px] opacity-80 mb-1">{meta}</div>}
                <div>{children}</div>
                {(timestamp || ticks) && (
                    <div className="mt-1 flex items-center gap-1 justify-end text-[10px] opacity-80 select-none">
                        {timestamp && <span dir="ltr">{timestamp}</span>}
                        {ticks === "single" && <Check className="size-3" />}
                        {ticks === "double" && <CheckCheck className="size-3 opacity-70" />}
                        {ticks === "read" && <CheckCheck className="size-3 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.55)]" />}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ───────────────── ChatStream ─────────────────
   A scroll-triggered conversation that pops bubbles in one by one with
   an optional typing dots step between turns.
*/
export function ChatStream({
    children,
    className = "",
    interval = 0.55,
    startDelay = 0.15,
}: {
    children: ReactNode;
    className?: string;
    interval?: number;
    startDelay?: number;
}) {
    const ref = useGsap(
        (_ctx, el) => {
            // useGsap short-circuits on reduced motion; this extra check
            // mirrors callers that may have stale closures.
            if (prefersReducedMotion()) return;
            const bubbles = el.querySelectorAll<HTMLElement>(".chat-bubble");
            void loadGsap().then(({ gsap }) => {
                gsap.from(bubbles, {
                    y: 14,
                    opacity: 0,
                    scale: 0.9,
                    transformOrigin: "bottom",
                    duration: 0.45,
                    ease: "back.out(1.7)",
                    stagger: interval,
                    delay: startDelay,
                    scrollTrigger: { trigger: el, start: "top 80%", once: true },
                });
            });
        },
        [interval, startDelay],
    );
    return (
        <div ref={ref} className={`space-y-3 ${className}`}>
            {children}
        </div>
    );
}

/* ───────────────── TypingDots ─────────────────
   Telegram-style three-dot typing indicator inside a bubble shell.
*/
export function TypingDots({ side = "them" }: { side?: "me" | "them" }) {
    const isMe = side === "me";
    const cls = isMe ? "bg-persimmon text-white" : "bg-white border border-rule text-bone-soft";
    // Mirror ChatBubble direction: user=right, bot=left in RTL.
    return (
        <div className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
            <div className={`chat-bubble ${cls} rounded-2xl px-3.5 py-3 inline-flex items-center gap-1.5`}>
                <span className="typing-dot" />
                <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                <span className="typing-dot" style={{ animationDelay: "0.30s" }} />
            </div>
        </div>
    );
}

/* ───────────────── ChatShell ─────────────────
   A complete Telegram-styled chat window (header + body + footer) used
   anywhere we want to dress a card up as a conversation.
*/
export function ChatShell({
    title = "TeleYab",
    subtitle,
    children,
    footer,
    avatar = "T",
    className = "",
    bodyClassName = "",
}: {
    title?: ReactNode;
    subtitle?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    avatar?: ReactNode;
    className?: string;
    bodyClassName?: string;
}) {
    return (
        <div className={`t-card overflow-hidden ${className}`}>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-rule-soft bg-persimmon-soft/50">
                <div className="size-9 rounded-full bg-persimmon text-white grid place-items-center font-extrabold shadow-lg shadow-persimmon/30">
                    {avatar}
                </div>
                <div className="flex-1 leading-tight">
                    <div className="font-bold text-bone text-sm flex items-center gap-1.5">{title}</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-bone-dim">
                        <span className="dot-live" />
                        {subtitle ?? "آنلاین"}
                    </div>
                </div>
            </div>
            <div className={`bg-tg-paper px-5 py-5 ${bodyClassName}`}>{children}</div>
            {footer && (
                <div className="px-5 py-3 border-t border-rule-soft text-[11px] text-bone-dim flex items-center justify-between">
                    {footer}
                </div>
            )}
        </div>
    );
}

/* ───────────────── LiveChatDemo ─────────────────
   The hero demo: a live, looping conversation that "types" and reveals
   results.  Lives on the home page right column.
*/
type DemoHit = {
    kind: "ok";
    phone: string;
    email?: string;
    name?: string;
    prevNames?: string[];
    birthday?: string;
};
type DemoMiss = { kind: "fail" };

export function LiveChatDemo() {
    const scenarios: { query: string; wait: number; res: DemoHit | DemoMiss }[] = [
        {
            query: "@arman_dev",
            wait: 900,
            res: {
                kind: "ok",
                phone: "+98 912 *** 4521",
                email: "arman.d***@gmail.com",
                name: "آرمان دهقانی",
                prevNames: ["arman_98", "armandev"],
                birthday: "۱۳۷۲/۰۴/۱۸",
            },
        },
        {
            query: "@maral_art",
            wait: 1100,
            res: {
                kind: "ok",
                phone: "+98 935 *** 7180",
                email: "maral.k***@yahoo.com",
                name: "مارال کریمی",
                prevNames: ["maral_design"],
                birthday: "۱۳۷۵/۱۱/۰۲",
            },
        },
        {
            query: "@notarealhandle_999",
            wait: 700,
            res: { kind: "fail" },
        },
    ];

    const [step, setStep] = useState(0);
    const [phase, setPhase] = useState<"idle" | "query" | "typing" | "reply" | "done">("idle");
    const turnRef = useRef(0);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            while (!cancelled) {
                for (let i = 0; i < scenarios.length; i++) {
                    if (cancelled) return;
                    turnRef.current = i;
                    setStep(i);
                    setPhase("query");
                    await new Promise((r) => setTimeout(r, scenarios[i].query.length * 35 + 350));
                    if (cancelled) return;
                    setPhase("typing");
                    await new Promise((r) => setTimeout(r, scenarios[i].wait));
                    if (cancelled) return;
                    setPhase("reply");
                    await new Promise((r) => setTimeout(r, 2400));
                }
            }
        };
        run();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const s = scenarios[step];
    return (
        <ChatShell
            subtitle="در حال پاسخ‌گویی"
            footer={
                <>
                    <span>پاسخ معمولی</span>
                    <span dir="ltr" className="font-mono font-bold text-persimmon-deep">
                        &lt; 2s
                    </span>
                </>
            }
        >
            <div className="space-y-3 min-h-[260px]">
                <ChatBubble side="me" tone="brand" ticks="read" timestamp="20:14">
                    <span dir="ltr" className="font-mono text-[0.95rem]">
                        <Typewriter key={"q-" + step} text={s.query} speed={36} cursor={phase === "query"} dir="ltr" />
                    </span>
                </ChatBubble>

                {phase === "typing" && <TypingDots />}

                {phase === "reply" && s.res.kind === "ok" && (
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
                            <div
                                dir="ltr"
                                className="font-mono font-extrabold text-[1.05rem] text-persimmon-deep tracking-tight"
                            >
                                {s.res.phone}
                            </div>
                            {s.res.name && (
                                <div className="text-[12px] text-bone">
                                    <span className="text-bone-dim">نام:</span> {s.res.name}
                                </div>
                            )}
                            {s.res.email && (
                                <div dir="ltr" className="text-[12px] font-mono text-bone">
                                    <span className="text-bone-dim">email:</span> {s.res.email}
                                </div>
                            )}
                            {s.res.prevNames && s.res.prevNames.length > 0 && (
                                <div className="text-[11px] text-bone-soft">
                                    <span className="text-bone-dim">یوزرنیم‌های قبلی:</span>{" "}
                                    <span dir="ltr" className="font-mono">
                                        {s.res.prevNames.map((n) => "@" + n).join(", ")}
                                    </span>
                                </div>
                            )}
                            {s.res.birthday && (
                                <div className="text-[11px] text-bone-soft">
                                    <span className="text-bone-dim">تولد:</span> {s.res.birthday}
                                </div>
                            )}
                        </div>
                    </ChatBubble>
                )}

                {phase === "reply" && s.res.kind === "fail" && (
                    <ChatBubble side="them" tone="muted" timestamp="20:14">
                        <div className="text-xs">یافت نشد · ۰ تومان · رایگان</div>
                    </ChatBubble>
                )}
            </div>
        </ChatShell>
    );
}
