"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, Send, Upload } from "lucide-react";
import { ScrollReveal, StaggerChildren, loadGsap, prefersReducedMotion } from "@/lib/motion";
import { BreadcrumbLD } from "@/components/schema-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

type Batch = {
    id: number;
    name?: string;
    total: number;
    completed: number;
    successful: number;
    cost_toman: number;
    status: string;
    created_at: string;
};

function fmt(n: number | undefined | null) {
    return new Intl.NumberFormat("fa-IR").format(Math.round(n ?? 0));
}

export default function BatchPage() {
    const [authed, setAuthed] = useState<boolean | null>(null);
    const [batches, setBatches] = useState<Batch[] | null>(null);
    const [name, setName] = useState("");
    const [text, setText] = useState("");
    const [creating, setCreating] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const lastBatchIdRef = useRef<number | null>(null);
    const newestRowRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        fetch("/api/me", { cache: "no-store" }).then((r) => setAuthed(r.ok));
        refresh();
        const i = setInterval(refresh, 3000);
        return () => clearInterval(i);
    }, []);

    function refresh() {
        fetch("/api/lookup/batches", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => setBatches(j?.batches ?? []));
    }

    // Pop-in for newest batch row when it appears. GSAP is lazy-loaded so
    // the batch list page doesn't ship the motion bundle on first paint.
    useEffect(() => {
        if (!batches || batches.length === 0) return;
        const newestId = batches[0].id;
        if (lastBatchIdRef.current === null) {
            lastBatchIdRef.current = newestId;
            return;
        }
        if (newestId !== lastBatchIdRef.current) {
            lastBatchIdRef.current = newestId;
            const el = newestRowRef.current;
            if (!el || prefersReducedMotion()) return;
            let cancelled = false;
            void loadGsap().then(({ gsap }) => {
                if (cancelled || !el) return;
                gsap.fromTo(
                    el,
                    { y: 16, opacity: 0, scale: 0.94, transformOrigin: "top center" },
                    { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: "back.out(1.7)" },
                );
            });
            return () => { cancelled = true; };
        }
    }, [batches]);

    async function submit() {
        setErr(null);
        setCreating(true);
        const queries = text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
        if (queries.length === 0) {
            setErr("حداقل یک پرس‌و‌جو وارد کن");
            setCreating(false);
            return;
        }
        const r = await fetch("/api/lookup/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ queries, name }),
        });
        const j = await r.json().catch(() => null);
        if (!r.ok) {
            setErr(j?.message ?? "ساختِ دسته ناموفق بود");
        } else {
            setText(""); setName("");
            refresh();
        }
        setCreating(false);
    }

    function onFile(f: File | undefined) {
        if (!f) return;
        f.text().then((s) => setText(s));
    }

    if (authed === false) {
        return (
            <main className="mx-auto max-w-md px-4 py-20">
                <div className="t-card t-card-pad-lg text-center">
                    <h1 className="display-fa text-2xl text-bone mb-2">ابتدا وارد شو.</h1>
                    <p className="text-sm text-bone-soft mb-6">برای جست‌و‌جوی دسته‌ای باید وارد حسابت شوی.</p>
                    <Link href="/login" className="t-btn t-btn-primary w-full">
                        ورود
                        <ArrowLeft className="size-4" />
                    </Link>
                </div>
            </main>
        );
    }

    const count = text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).length;

    return (
        <main className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-20 lg:px-8">
            <BreadcrumbLD
                siteUrl={SITE_URL}
                items={[
                    { name: "خانه", url: SITE_URL + "/" },
                    { name: "دسته‌ای", url: SITE_URL + "/batch" },
                ]}
            />
            <div className="pointer-events-none absolute -top-16 -inset-s-24 size-80 rounded-full bg-persimmon/15 blur-3xl blob-drift" aria-hidden />

            <ScrollReveal as="header" className="mb-7">
                <span className="t-chip t-chip-brand mb-4">
                    <Layers className="size-3.5" />
                    حالتِ دسته‌ای
                </span>
                <h1 className="display-fa text-3xl sm:text-4xl text-bone leading-tight">
                    یک‌جا، تا{" "}
                    <span className="text-persimmon">۵۰۰ ردیف.</span>
                </h1>
                <p className="mt-3 text-bone-soft text-sm leading-loose">
                    لیستت را بفرست — هر یوزرنیمِ یافت‌شده دقیقاً مثلِ جست‌و‌جوی تکی محاسبه می‌شود.{" "}
                    <span className="text-bone">شکست رایگان است.</span>
                </p>
            </ScrollReveal>

            {/* New batch — drop zone */}
            <ScrollReveal className="relative mb-10">
                <div className="pointer-events-none absolute inset-0 -m-2 rounded-3xl bg-persimmon/10 blur-2xl glow-pulse" aria-hidden />
                <div className="relative t-card overflow-hidden border-dashed border-persimmon/45 bg-white/85">
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-rule-soft bg-persimmon-soft/40">
                        <div className="size-8 rounded-full bg-persimmon text-white grid place-items-center font-extrabold text-sm">
                            ⇢
                        </div>
                        <div className="leading-tight flex-1">
                            <div className="text-sm font-bold text-bone">ساختِ دسته</div>
                            <div className="text-[11px] text-bone-dim">یوزرنیم‌ها را در هر خط یا با ویرگول جدا کن</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="t-btn t-btn-ghost t-btn-sm"
                        >
                            <Upload className="size-3.5" />
                            CSV
                        </button>
                        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                    </div>

                    <div className="px-4 py-4 bg-tg-paper space-y-3">
                        <textarea
                            dir="auto"
                            rows={8}
                            className="w-full rounded-2xl border border-rule-soft bg-white text-bone outline-none px-4 py-3 font-mono text-sm leading-loose placeholder:text-whisper focus:border-persimmon focus:shadow-[0_0_0_4px_var(--color-persimmon-soft)] transition"
                            placeholder={"@durov\n@elonmusk\n@notifications"}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <input
                            className="t-input"
                            placeholder="نام دسته (اختیاری)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="text-[11px] text-bone-dim">
                                شناسایی‌شده:{" "}
                                <span className="font-mono text-bone font-bold">{fmt(count)}</span>{" "}
                                ردیف
                            </div>
                            <button
                                type="button"
                                disabled={creating || count === 0}
                                onClick={submit}
                                className="t-btn t-btn-primary"
                            >
                                <Send className="size-4 rtl:rotate-180" />
                                {creating ? "در حال ثبت…" : "شروع پردازش"}
                            </button>
                        </div>
                        {err ? <p className="text-rose text-sm">{err}</p> : null}
                    </div>
                </div>
            </ScrollReveal>

            {/* Recent batches */}
            <section>
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="display-fa text-lg text-bone">دسته‌های اخیر</h2>
                    <span className="text-[11px] text-bone-dim font-mono">
                        {batches ? batches.length : "…"} مورد
                    </span>
                </div>

                {batches === null ? (
                    <div className="t-card t-card-pad text-center text-bone-dim">…</div>
                ) : batches.length === 0 ? (
                    <div className="t-card t-card-pad text-center text-bone-soft">
                        هنوز دسته‌ای نساخته‌ای.
                    </div>
                ) : (
                    <StaggerChildren className="space-y-3" stagger={0.06}>
                        {batches.map((b, i) => {
                            const pct = b.total > 0 ? Math.min(100, Math.round((b.completed / b.total) * 100)) : 0;
                            return (
                                <Link
                                    key={b.id}
                                    href={`/batch/${b.id}`}
                                    ref={i === 0 ? newestRowRef : undefined}
                                    className="t-card lift t-card-pad block group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="size-9 rounded-full bg-persimmon-soft text-persimmon-deep grid place-items-center shrink-0">
                                            <Layers className="size-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-bone font-bold text-sm group-hover:text-persimmon-deep transition-colors">
                                                    {b.name || <span className="font-mono text-whisper">#{b.id}</span>}
                                                </span>
                                                <StatusChip status={b.status} />
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-bone-dim">
                                                <span>
                                                    <span className="font-mono text-bone-soft">{fmt(b.completed)}/{fmt(b.total)}</span> پردازش
                                                </span>
                                                <span>
                                                    <span className="font-mono text-jade">{fmt(b.successful)}</span> یافت‌شده
                                                </span>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="mt-2 h-1.5 w-full rounded-full bg-rule-soft overflow-hidden">
                                                <div
                                                    className="h-full bg-persimmon transition-all duration-700 ease-out rounded-full"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-end shrink-0">
                                            <div className="font-mono text-sm text-persimmon-deep font-bold">
                                                {fmt(b.cost_toman)}
                                            </div>
                                            <div className="text-[10px] text-bone-dim">تومان</div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </StaggerChildren>
                )}
            </section>
        </main>
    );
}

function StatusChip({ status }: { status: string }) {
    const tone =
        status === "completed" ? "t-chip-success"
        : status === "running" ? "t-chip-brand"
        : status === "failed" ? "t-chip-danger"
        : status === "cancelled" ? "t-chip-muted"
        : "t-chip-warning";
    const label =
        status === "queued" ? "در صف"
        : status === "running" ? "در حال پردازش"
        : status === "completed" ? "تمام شد"
        : status === "failed" ? "ناموفق"
        : status === "cancelled" ? "لغو شد"
        : status;
    return (
        <span className={`t-chip ${tone} text-[10px]`}>
            {status === "running" && <span className="dot-live" />}
            {label}
        </span>
    );
}
