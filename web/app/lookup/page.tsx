"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Send, Wallet } from "lucide-react";
import { ChatBubble, TypingDots } from "@/components/chat";
import { loadGsap, prefersReducedMotion } from "@/lib/motion";
import { BreadcrumbLD, SoftwareApplicationLD } from "@/components/schema-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";
// Schema-only price fallback (Toman). User-facing pricing always comes from /api/me.
const SCHEMA_PRICE_FALLBACK = 800000;

type LookupOk = {
    success: true;
    query?: string;
    numbers?: string[];
    country?: string;
    additional_data?: unknown;
    cost_toman?: number;
    balance_toman?: number;
    cached?: boolean;
    provider?: string;
};
type LookupFail = {
    success: false;
    error?: string;
    balance_toman?: number;
    price_per_lookup_toman?: number;
};
type LookupResp = LookupOk | LookupFail;

type Me = {
    email?: string;
    balance_toman?: number;
    role?: string;
    price_per_lookup_toman?: number;
};

type Turn =
    | { kind: "query"; text: string; ts: string }
    | { kind: "typing" }
    | { kind: "ok"; resp: LookupOk; ts: string }
    | { kind: "fail"; resp: LookupFail; ts: string; query: string }
    | { kind: "error"; message: string; code: string | null; query: string; ts: string };

function fmt(n: number | undefined) {
    if (n == null) return "—";
    return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}

function timestamp() {
    const d = new Date();
    return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

export default function LookupPage() {
    const [me, setMe] = useState<Me | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [q, setQ] = useState("");
    const [busy, setBusy] = useState(false);
    const [turns, setTurns] = useState<Turn[]>([]);
    const threadRef = useRef<HTMLDivElement>(null);
    const lastQuery = useRef<string>("");

    useEffect(() => {
        fetch("/api/me", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => setMe(j))
            .finally(() => setAuthChecked(true));
    }, []);

    // Auto-scroll thread on new turn + bubble pop animation
    useEffect(() => {
        const root = threadRef.current;
        if (!root) return;
        const bubbles = root.querySelectorAll<HTMLElement>(".chat-bubble");
        const last = bubbles[bubbles.length - 1];
        if (last && !prefersReducedMotion()) {
            void loadGsap().then(({ gsap }) => {
                gsap.fromTo(
                    last,
                    { y: 12, opacity: 0, scale: 0.9, transformOrigin: "bottom" },
                    { y: 0, opacity: 1, scale: 1, duration: 0.42, ease: "back.out(1.7)" },
                );
            });
        }
        // smooth scroll the thread to bottom
        root.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
    }, [turns]);

    async function runQuery(query: string) {
        setBusy(true);
        lastQuery.current = query;
        setTurns((t) => [...t, { kind: "query", text: query, ts: timestamp() }, { kind: "typing" }]);

        try {
            const r = await fetch("/api/lookup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });
            const j = await r.json().catch(() => null);
            if (!r.ok) {
                setTurns((t) => [
                    ...t.filter((x) => x.kind !== "typing"),
                    {
                        kind: "error",
                        message: j?.message ?? `خطا (${r.status})`,
                        code: j?.error ?? null,
                        query,
                        ts: timestamp(),
                    },
                ]);
                if (j && typeof j.balance_toman === "number") {
                    setMe((m) => (m ? { ...m, balance_toman: j.balance_toman } : m));
                }
            } else {
                const resp = j as LookupResp;
                if (resp.success) {
                    setTurns((t) => [...t.filter((x) => x.kind !== "typing"), { kind: "ok", resp, ts: timestamp() }]);
                } else {
                    setTurns((t) => [
                        ...t.filter((x) => x.kind !== "typing"),
                        { kind: "fail", resp, query, ts: timestamp() },
                    ]);
                }
                if (typeof j.balance_toman === "number") {
                    setMe((m) => (m ? { ...m, balance_toman: j.balance_toman } : m));
                }
            }
        } catch {
            setTurns((t) => [
                ...t.filter((x) => x.kind !== "typing"),
                { kind: "error", message: "اتصال برقرار نشد", code: null, query, ts: timestamp() },
            ]);
        } finally {
            setBusy(false);
        }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        const v = q.trim();
        if (!v) return;
        setQ("");
        await runQuery(v);
    }

    if (authChecked && !me?.email) {
        return (
            <main className="mx-auto max-w-md px-4 py-20">
                <div className="t-card t-card-pad-lg text-center">
                    <h1 className="display-fa text-2xl text-bone mb-2">ابتدا وارد شو.</h1>
                    <p className="text-sm text-bone-soft mb-6">برای استفاده از سرویس باید وارد حسابت شوی.</p>
                    <Link href="/login" className="t-btn t-btn-primary w-full">
                        ورود
                        <ArrowLeft className="size-4" />
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-20 lg:px-8">
            <BreadcrumbLD
                siteUrl={SITE_URL}
                items={[
                    { name: "خانه", url: SITE_URL + "/" },
                    { name: "جست‌و‌جو", url: SITE_URL + "/lookup" },
                ]}
            />
            <SoftwareApplicationLD
                siteUrl={SITE_URL}
                priceToman={me?.price_per_lookup_toman ?? SCHEMA_PRICE_FALLBACK}
            />
            <header className="mb-7">
                <span className="t-chip t-chip-brand mb-4">
                    <span className="dot-live" />
                    آنلاین · در حالِ پاسخ‌گویی
                </span>
                <h1 className="display-fa text-3xl sm:text-4xl text-bone leading-tight">
                    یوزرنیمِ تلگرام را بفرست.
                </h1>
                <p className="mt-3 text-bone-soft text-sm leading-loose">
                    هزینهٔ هر نتیجهٔ موفق:{" "}
                    <span className="font-bold text-persimmon-deep">{fmt(me?.price_per_lookup_toman)} تومان</span>
                    . پیدا نشد ← صفر تومان.
                </p>
            </header>

            {/* Chat-thread shell */}
            <div className="t-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-rule-soft bg-persimmon-soft/40">
                    <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-persimmon text-white grid place-items-center font-extrabold text-sm">
                            T
                        </div>
                        <div className="leading-tight">
                            <div className="text-sm font-bold text-bone">TeleYab</div>
                            <div className="text-[11px] text-bone-dim inline-flex items-center gap-1.5">
                                <span className="dot-live" /> آنلاین
                            </div>
                        </div>
                    </div>
                    <Link
                        href="/topup"
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/60 ring-1 ring-persimmon/15 px-2.5 py-1 text-[11px] font-bold text-persimmon-deep hover:bg-white"
                    >
                        <Wallet className="size-3" />
                        <span dir="ltr" className="font-mono">{fmt(me?.balance_toman)}</span> ت
                    </Link>
                </div>

                {/* Thread body */}
                <div
                    ref={threadRef}
                    className="bg-tg-paper px-4 sm:px-5 py-5 space-y-3 max-h-[460px] overflow-y-auto scroll-smooth"
                >
                    {turns.length === 0 && (
                        <ChatBubble side="them" tone="muted">
                            یوزرنیمِ تلگرامی یا آی‌دیِ عددی را در فرمِ پایین بفرست. <br />
                            <span className="text-[11px] text-bone-dim">مثال: <span dir="ltr" className="font-mono">@durov</span></span>
                        </ChatBubble>
                    )}
                    {turns.map((t, i) => renderTurn(t, i, () => runQuery(lastQuery.current)))}
                </div>

                {/* Composer */}
                <form onSubmit={submit} className="border-t border-rule-soft bg-white">
                    <div className="px-3 py-2 flex items-center gap-2">
                        <div className="relative flex-1" dir="ltr">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-bone-dim pointer-events-none" />
                            <input
                                className="w-full h-11 rounded-full border border-rule-soft bg-night-700/60 pl-10 pr-3 text-sm font-mono placeholder:text-whisper focus:outline-none focus:border-persimmon focus:bg-white focus:shadow-[0_0_0_4px_var(--color-persimmon-soft)] transition"
                                dir="ltr"
                                placeholder="@username  ·  123456789"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                disabled={busy}
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={busy || !q.trim()}
                            aria-label="ارسال"
                            className="grid place-items-center size-11 rounded-full bg-persimmon text-white hover:bg-persimmon-deep disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-[0_6px_18px_-10px_rgba(34,158,217,0.7)]"
                        >
                            <Send className="size-4 rtl:rotate-180" />
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3 text-sm">
                <Link href="/wallet" className="text-persimmon hover:underline">
                    تاریخچهٔ کامل
                </Link>
                <span className="text-bone-dim">·</span>
                <Link href="/batch" className="text-persimmon hover:underline">
                    جست‌و‌جوی دسته‌ای
                </Link>
            </div>
        </main>
    );
}

function renderTurn(t: Turn, i: number, retry: () => void) {
    switch (t.kind) {
        case "query":
            return (
                <ChatBubble key={i} side="me" tone="brand" ticks="read" timestamp={t.ts}>
                    <span dir="ltr" className="font-mono">{t.text}</span>
                </ChatBubble>
            );
        case "typing":
            return <TypingDots key={i} />;
        case "ok":
            return (
                <ChatBubble
                    key={i}
                    side="them"
                    timestamp={t.ts}
                    meta={
                        <span className="inline-flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-jade" /> یافت شد
                            {t.resp.country ? <span className="text-bone-dim">· {t.resp.country}</span> : null}
                            {t.resp.cached ? (
                                <span className="text-[10px] font-bold text-persimmon-deep ms-1">از کش</span>
                            ) : null}
                        </span>
                    }
                >
                    <div className="space-y-1">
                        {(t.resp.numbers ?? []).map((n) => (
                            <div
                                key={n}
                                dir="ltr"
                                className="font-mono font-extrabold text-base sm:text-lg tracking-wider text-persimmon-deep"
                            >
                                {n}
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-bone-dim">
                        {t.resp.query ? (
                            <span dir="ltr" className="font-mono truncate">{t.resp.query}</span>
                        ) : null}
                        <span>هزینه: <span className="font-mono text-bone-soft">{fmt(t.resp.cost_toman)} ت</span></span>
                        <span>مانده: <span className="font-mono text-bone-soft">{fmt(t.resp.balance_toman)} ت</span></span>
                    </div>
                    {t.resp.additional_data ? (
                        <details className="mt-2">
                            <summary className="text-[10px] text-bone-dim cursor-pointer">JSON تکمیلی</summary>
                            <pre
                                dir="ltr"
                                className="mt-1 p-2 bg-night-700 rounded text-[10px] overflow-auto font-mono text-bone-soft"
                            >
                                {JSON.stringify(t.resp.additional_data, null, 2)}
                            </pre>
                        </details>
                    ) : null}
                </ChatBubble>
            );
        case "fail":
            return (
                <ChatBubble key={i} side="them" tone="muted" timestamp={t.ts}>
                    <div className="text-sm">
                        <span dir="ltr" className="font-mono">{t.query}</span> · در دیتابیس نیست
                    </div>
                    <div className="text-[11px] text-bone-dim mt-1">۰ تومان · رایگان</div>
                </ChatBubble>
            );
        case "error": {
            const upstream = t.code === "upstream_unavailable";
            const lowBal = t.code === "insufficient_balance";
            return (
                <ChatBubble key={i} side="them" tone="danger" timestamp={t.ts}>
                    <div className="text-sm font-bold">{t.message}</div>
                    {upstream && (
                        <button onClick={retry} className="mt-2 t-btn t-btn-success t-btn-sm">
                            تلاشِ دوباره — رایگان
                        </button>
                    )}
                    {lowBal && (
                        <Link href="/topup" className="inline-flex mt-2 t-btn t-btn-primary t-btn-sm">
                            شارژ کیف پول
                        </Link>
                    )}
                </ChatBubble>
            );
        }
    }
}
