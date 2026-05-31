"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollReveal, StaggerChildren } from "@/lib/motion";

type Flag = { id: number; email: string; flagged_at?: string; flag_reason?: string; balance_toman: number };

function fmt(n: number) { return new Intl.NumberFormat("fa-IR").format(Math.round(n)); }
function fmtDate(s?: string) {
    if (!s) return "—";
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(s));
}

export default function AdminFlags() {
    const [items, setItems] = useState<Flag[] | null>(null);
    useEffect(() => {
        fetch("/api/admin/flags", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => setItems(j?.flags ?? []));
    }, []);

    return (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="pt-6">
                <Link href="/admin" className="text-bone-soft hover:text-persimmon text-sm">← داشبورد</Link>
            </div>

            <ScrollReveal className="py-8" y={16}>
                <span className="t-chip t-chip-warning mb-3 inline-flex">
                    <span className="dot-live" />
                    FLAGS · SUSPECTED ABUSE
                </span>
                <h1 className="display-fa mt-3 text-bone text-3xl md:text-5xl">گزارش‌ها.</h1>
                <p className="mt-4 max-w-2xl text-bone-soft leading-loose">
                    وقتی نسبتِ موفقیتِ کاربر زیر آستانهٔ تنظیم‌شده بیاید، خودکار اینجا ظاهر می‌شود.
                </p>
            </ScrollReveal>

            {items === null ? (
                <div className="t-card t-card-pad text-center text-bone-dim">…</div>
            ) : items.length === 0 ? (
                <div className="t-card t-card-pad-lg text-center">
                    <span className="t-chip t-chip-success mb-3 inline-flex">NO FLAGS</span>
                    <p className="mt-3 text-bone-soft">هیچ کاربر مشکوکی نیست.</p>
                </div>
            ) : (
                <StaggerChildren className="grid gap-2 pb-12" stagger={0.05}>
                    {items.map((f, i) => (
                        <Link
                            key={f.id}
                            href={`/admin/users/${f.id}`}
                            className="t-card t-card-pad lift group grid grid-cols-12 items-center gap-3"
                        >
                            <span className="col-span-1 font-mono text-[10px] text-bone-dim">{String(i + 1).padStart(2, "0")}</span>
                            <span className="col-span-4 ltr font-mono text-sm text-bone group-hover:text-persimmon truncate" dir="ltr">{f.email}</span>
                            <span className="col-span-3 text-xs text-bone-dim">{fmtDate(f.flagged_at)}</span>
                            <span className="col-span-2 ltr font-mono text-sm text-bone" dir="ltr">{fmt(f.balance_toman)} T</span>
                            <span dir="ltr" className="col-span-2 text-end ltr font-mono text-[10px] text-bone-dim truncate">{f.flag_reason}</span>
                        </Link>
                    ))}
                </StaggerChildren>
            )}
        </main>
    );
}
