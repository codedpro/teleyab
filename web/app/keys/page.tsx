"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Key as KeyIcon, Send, Trash2 } from "lucide-react";
import { ScrollReveal, StaggerChildren, loadGsap, prefersReducedMotion } from "@/lib/motion";
import { BreadcrumbLD } from "@/components/schema-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

type Key = {
    id: number;
    key_prefix: string;
    name?: string;
    last_used_at?: string;
    revoked_at?: string;
    created_at: string;
};

function fmtDate(s?: string) {
    if (!s) return "—";
    return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "short", day: "numeric" }).format(new Date(s));
}

export default function KeysPage() {
    const [keys, setKeys] = useState<Key[] | null>(null);
    const [name, setName] = useState("");
    const [authed, setAuthed] = useState<boolean | null>(null);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const revealRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch("/api/me", { cache: "no-store" }).then((r) => setAuthed(r.ok));
        refresh();
    }, []);

    // Pop-in animation when a new key is revealed.  GSAP is lazy-loaded
    // so users that never create a key never pay the import cost.
    useEffect(() => {
        const el = revealRef.current;
        if (!el || !newKey) return;
        if (prefersReducedMotion()) return;
        let cancelled = false;
        void loadGsap().then(({ gsap }) => {
            if (cancelled || !el) return;
            gsap.fromTo(
                el,
                { y: 14, opacity: 0, scale: 0.92, transformOrigin: "top right" },
                { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: "back.out(1.7)" },
            );
        });
        return () => { cancelled = true; };
    }, [newKey]);

    function refresh() {
        fetch("/api/keys", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => setKeys(j?.keys ?? []));
    }

    async function create() {
        const r = await fetch("/api/keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        const j = await r.json().catch(() => null);
        if (r.ok && j?.key) {
            setNewKey(j.key);
            setName("");
            refresh();
        }
    }

    async function revoke(id: number) {
        if (!confirm("کلید را باطل می‌کنی؟ بازگشت‌پذیر نیست.")) return;
        await fetch(`/api/keys/${id}`, { method: "DELETE" });
        refresh();
    }

    if (authed === false) {
        return (
            <main className="mx-auto max-w-md px-4 py-20">
                <div className="t-card t-card-pad-lg text-center">
                    <h1 className="display-fa text-2xl text-bone mb-2">ابتدا وارد شو.</h1>
                    <p className="text-sm text-bone-soft mb-6">برای ساختِ کلید باید وارد حسابت شوی.</p>
                    <Link href="/login" className="t-btn t-btn-primary w-full">
                        ورود
                        <ArrowLeft className="size-4" />
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-20 lg:px-8">
            <BreadcrumbLD
                siteUrl={SITE_URL}
                items={[
                    { name: "خانه", url: SITE_URL + "/" },
                    { name: "کلیدها", url: SITE_URL + "/keys" },
                ]}
            />
            <div className="pointer-events-none absolute -top-12 -inset-e-24 size-72 rounded-full bg-persimmon/15 blur-3xl blob-drift" aria-hidden />

            <ScrollReveal as="header" className="mb-7">
                <span className="t-chip t-chip-brand mb-4">
                    <KeyIcon className="size-3.5" />
                    توسعه‌دهنده · کلید API
                </span>
                <h1 className="display-fa text-3xl sm:text-4xl text-bone leading-tight">
                    کلیدِ <span className="text-persimmon">Bearer</span> بساز.
                </h1>
                <p className="mt-3 text-bone-soft text-sm leading-loose">
                    کلیدت را در هدر{" "}
                    <span dir="ltr" className="font-mono text-bone">Authorization: Bearer …</span>{" "}
                    بفرست و از{" "}
                    <span dir="ltr" className="font-mono text-bone">/api/v1/lookup</span>{" "}
                    استفاده کن. هزینه دقیقاً مثلِ داشبورد.
                </p>
            </ScrollReveal>

            {/* Composer — chat-style "create new key" */}
            <ScrollReveal className="t-card overflow-hidden mb-5">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-rule-soft bg-persimmon-soft/40">
                    <div className="size-8 rounded-full bg-persimmon text-white grid place-items-center font-extrabold text-sm">
                        +
                    </div>
                    <div className="leading-tight">
                        <div className="text-sm font-bold text-bone">کلیدِ تازه</div>
                        <div className="text-[11px] text-bone-dim">یک اسمِ یادگاری بده و بفرست</div>
                    </div>
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (name.trim()) create();
                    }}
                    className="bg-white"
                >
                    <div className="px-3 py-2 flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                className="w-full h-11 rounded-full border border-rule-soft bg-night-700/60 px-4 text-sm font-mono placeholder:text-whisper focus:outline-none focus:border-persimmon focus:bg-white focus:shadow-[0_0_0_4px_var(--color-persimmon-soft)] transition"
                                dir="ltr"
                                placeholder="my-app-prod"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            aria-label="ساخت کلید"
                            className="grid place-items-center size-11 rounded-full bg-persimmon text-white hover:bg-persimmon-deep disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-[0_6px_18px_-10px_rgba(34,158,217,0.7)]"
                        >
                            <Send className="size-4 rtl:rotate-180" />
                        </button>
                    </div>
                </form>
            </ScrollReveal>

            {/* New-key reveal (chat-bubble flavored) */}
            {newKey ? (
                <div ref={revealRef} className="mb-6">
                    <div className="t-card border-persimmon/40 bg-persimmon/5 t-card-pad">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <span className="t-chip t-chip-brand">
                                <span className="dot-live" />
                                فقط یک‌بار نشان داده می‌شود — همین حالا کپی کن
                            </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(newKey);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                }}
                                className="t-btn t-btn-primary t-btn-sm"
                            >
                                <Copy className="size-3.5" />
                                {copied ? "کپی شد!" : "کپی"}
                            </button>
                        </div>
                        <code
                            dir="ltr"
                            className="mt-3 block font-mono text-sm sm:text-base text-bone break-all bg-white border border-rule-soft rounded-xl px-3 py-2.5"
                        >
                            {newKey}
                        </code>
                    </div>
                </div>
            ) : null}

            {/* Existing keys */}
            <section className="mt-2">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="display-fa text-lg text-bone">کلیدهای فعال</h2>
                    <span className="text-[11px] text-bone-dim font-mono">
                        {keys ? keys.length : "…"} عدد
                    </span>
                </div>

                {keys === null ? (
                    <div className="t-card t-card-pad text-bone-dim text-center">…</div>
                ) : keys.length === 0 ? (
                    <div className="t-card t-card-pad text-center text-bone-soft">
                        هنوز کلیدی نساخته‌ای.
                    </div>
                ) : (
                    <StaggerChildren className="space-y-3" stagger={0.06}>
                        {keys.map((k) => (
                            <div key={k.id} className="t-card lift t-card-pad">
                                <div className="flex items-start gap-3">
                                    <div className="size-9 rounded-full bg-persimmon-soft text-persimmon-deep grid place-items-center shrink-0">
                                        <KeyIcon className="size-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-bone font-bold text-sm">
                                                {k.name || <span className="text-whisper font-mono">بی‌نام</span>}
                                            </span>
                                            {k.revoked_at ? (
                                                <span className="t-chip t-chip-muted text-[10px]">باطل‌شده</span>
                                            ) : (
                                                <span className="t-chip t-chip-success text-[10px]">
                                                    <span className="dot-live" />
                                                    فعال
                                                </span>
                                            )}
                                        </div>
                                        <code dir="ltr" className="block mt-1 font-mono text-xs text-bone-soft">
                                            {k.key_prefix}…
                                        </code>
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-bone-dim">
                                            <span>ساخت: {fmtDate(k.created_at)}</span>
                                            <span>آخرین استفاده: {fmtDate(k.last_used_at)}</span>
                                        </div>
                                    </div>
                                    {!k.revoked_at && (
                                        <button
                                            onClick={() => revoke(k.id)}
                                            className="t-btn t-btn-ghost t-btn-sm text-rose"
                                            aria-label={`باطل کردنِ کلیدِ ${k.name || k.key_prefix}`}
                                        >
                                            <Trash2 className="size-3.5" />
                                            باطل
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </StaggerChildren>
                )}
            </section>

            {/* Usage example — terminal-chrome curl block */}
            <ScrollReveal className="mt-10">
                <h2 className="display-fa text-lg text-bone mb-3 px-1">نمونهٔ curl</h2>
                <div className="t-card overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-rule-soft bg-night-700">
                        <div className="flex gap-1.5">
                            <span className="size-2.5 rounded-full bg-rose/60" />
                            <span className="size-2.5 rounded-full bg-saffron/80" />
                            <span className="size-2.5 rounded-full bg-jade/80" />
                        </div>
                        <div className="text-[11px] text-bone-dim ms-2 font-mono">curl — teleyab</div>
                    </div>
                    <pre
                        dir="ltr"
                        className="font-mono text-[12.5px] sm:text-[13px] leading-7 text-bone p-5 overflow-x-auto bg-white"
                    >
{`curl -X POST https://teleyab.ir/api/v1/lookup \\
  -H "Authorization: Bearer tly_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "query": "@durov" }'

# → { "success": true,
#     "numbers": ["+989124528521"],
#     "country": "IR",
#     "cost_toman": 800000,
#     "balance_toman": 49200000 }`}
                    </pre>
                </div>
            </ScrollReveal>
        </main>
    );
}
