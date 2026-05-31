"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScrollReveal, StaggerChildren, CountUp } from "@/lib/motion";

type Item = {
    id: number;
    query: string;
    status: string;
    error?: string;
    success?: boolean;
    numbers?: string[];
    country?: string;
};

type Batch = {
    id: number;
    name?: string;
    total: number;
    completed: number;
    successful: number;
    cost_toman: number;
    status: string;
    created_at: string;
    completed_at?: string;
    items: Item[];
};

function fmt(n: number) {
    return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}

export default function BatchDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [batch, setBatch] = useState<Batch | null>(null);

    useEffect(() => {
        const tick = () =>
            fetch(`/api/lookup/batch/${id}`, { cache: "no-store" })
                .then((r) => (r.ok ? r.json() : null))
                .then(setBatch);
        tick();
        const i = setInterval(tick, 2500);
        return () => clearInterval(i);
    }, [id]);

    if (!batch) {
        return (
            <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 lg:px-8">
                <div className="t-card t-card-pad inline-flex items-center gap-2 text-bone-dim text-sm">
                    <span className="typing-dot" />
                    <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                    <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                    در حالِ بارگذاری
                </div>
            </main>
        );
    }

    const pct = batch.total === 0 ? 0 : Math.round((batch.completed / batch.total) * 100);

    return (
        <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-20 lg:px-8">
            <Link href="/batch" className="inline-flex items-center gap-1 text-bone-soft hover:text-persimmon text-sm">
                <ArrowLeft className="size-3.5 rtl:rotate-180" />
                همهٔ دسته‌ها
            </Link>

            <ScrollReveal className="mt-6">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="t-chip t-chip-brand">
                        <span className="dot-live" />
                        دسته · #{batch.id}
                    </span>
                    <StatusChip status={batch.status} />
                </div>
                <h1 className="display-fa text-bone text-3xl sm:text-4xl">
                    {batch.name || (
                        <span dir="ltr" className="font-mono text-bone-dim">
                            #{batch.id}
                        </span>
                    )}
                </h1>
            </ScrollReveal>

            <ScrollReveal className="mt-8 t-card overflow-hidden">
                <dl className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-rule-soft rtl:divide-x-reverse">
                    <Fig label="کل" v={batch.total} />
                    <Fig label="پردازش‌شده" v={batch.completed} />
                    <Fig label="موفق" v={batch.successful} />
                    <Fig label="هزینه (ت)" v={batch.cost_toman} />
                </dl>
                <div className="p-5 border-t border-rule-soft">
                    <div className="flex items-center justify-between mb-2 text-xs text-bone-dim">
                        <span>پیشرفت</span>
                        <span dir="ltr" className="font-mono font-bold text-persimmon-deep">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-night-700 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-persimmon transition-[width] duration-700 ease-out"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            </ScrollReveal>

            <section className="mt-10">
                <ScrollReveal className="flex items-center gap-2 mb-4">
                    <span className="t-chip t-chip-muted">ردیف‌ها</span>
                    <span className="text-xs text-bone-dim">{fmt(batch.items.length)} ردیف</span>
                </ScrollReveal>

                <StaggerChildren stagger={0.03} className="space-y-2">
                    {batch.items.map((it, i) => (
                        <div
                            key={it.id}
                            className="t-card lift grid grid-cols-12 items-center gap-3 px-3 py-3"
                        >
                            <span className="col-span-1 font-mono text-[10px] text-whisper">
                                {String(i + 1).padStart(2, "0")}
                            </span>
                            <span dir="ltr" className="col-span-5 font-mono text-sm text-bone truncate">
                                {it.query}
                            </span>
                            <span className="col-span-2">
                                <StatusChip status={it.status} small />
                            </span>
                            <span dir="ltr" className="col-span-4 font-mono text-sm text-end">
                                {it.success && it.numbers && it.numbers.length ? (
                                    <span className="text-persimmon-deep font-bold">{it.numbers.join(", ")}</span>
                                ) : it.error ? (
                                    <span className="text-rose">{it.error}</span>
                                ) : (
                                    <span className="text-whisper">—</span>
                                )}
                            </span>
                        </div>
                    ))}
                </StaggerChildren>
            </section>
        </main>
    );
}

function Fig({ label, v }: { label: string; v: number }) {
    return (
        <div className="px-4 py-5 text-center">
            <div className="text-[11px] text-bone-dim mb-1">{label}</div>
            <div className="text-2xl font-extrabold text-bone">
                <CountUp to={v} />
            </div>
        </div>
    );
}

function StatusChip({ status, small }: { status: string; small?: boolean }) {
    const tone =
        status === "completed" || status === "done"
            ? "t-chip-success"
            : status === "running"
            ? "t-chip-brand"
            : status === "failed" || status === "error"
            ? "t-chip-danger"
            : status === "skipped"
            ? "t-chip-warning"
            : "t-chip-muted";
    const labels: Record<string, string> = {
        completed: "تکمیل",
        done: "تکمیل",
        running: "در حال اجرا",
        failed: "ناموفق",
        error: "خطا",
        skipped: "ردشده",
        pending: "در صف",
    };
    return (
        <span className={`t-chip ${tone} ${small ? "text-[10px] px-2 py-0.5" : ""}`}>
            {labels[status] ?? status}
        </span>
    );
}
