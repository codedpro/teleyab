"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollReveal, StaggerChildren } from "@/lib/motion";

type Refund = {
    id: number;
    user_id: number;
    email?: string;
    lookup_id?: number;
    amount_toman: number;
    reason?: string;
    status: string;
    note?: string;
    created_at: string;
    resolved_at?: string;
};

function fmt(n: number) { return new Intl.NumberFormat("fa-IR").format(Math.round(n)); }
function fmtDate(s?: string) {
    if (!s) return "—";
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(s));
}

export default function AdminRefunds() {
    const [items, setItems] = useState<Refund[] | null>(null);
    const load = () => {
        fetch("/api/admin/refunds", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => setItems(j?.refunds ?? []));
    };
    useEffect(load, []);

    async function resolve(id: number) {
        if (!confirm("بازپرداخت تأیید و موجودی کاربر افزایش یابد؟")) return;
        await fetch(`/api/admin/refunds/${id}/resolve`, { method: "POST" });
        load();
    }
    async function reject(id: number) {
        if (!confirm("درخواست رد شود؟")) return;
        await fetch(`/api/admin/refunds/${id}/reject`, { method: "POST" });
        load();
    }

    return (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="pt-6">
                <Link href="/admin" className="text-bone-soft hover:text-persimmon text-sm">← داشبورد</Link>
            </div>

            <ScrollReveal className="py-8" y={16}>
                <span className="t-chip t-chip-warning mb-3 inline-flex">
                    <span className="dot-live" />
                    QUEUE · REFUNDS
                </span>
                <h1 className="display-fa mt-3 text-bone text-3xl md:text-5xl">صفِ بازپرداخت.</h1>
            </ScrollReveal>

            {items === null ? (
                <div className="t-card t-card-pad text-center text-bone-dim">…</div>
            ) : items.length === 0 ? (
                <div className="t-card t-card-pad-lg text-center">
                    <span className="t-chip t-chip-success mb-3 inline-flex">QUEUE EMPTY</span>
                    <p className="mt-3 text-bone-soft">چیزی برای بررسی نیست.</p>
                </div>
            ) : (
                <StaggerChildren className="grid gap-2 pb-12" stagger={0.05}>
                    {items.map((r, i) => (
                        <div key={r.id} className="t-card t-card-pad lift">
                            <div className="grid grid-cols-12 items-center gap-3">
                                <span className="col-span-1 font-mono text-[10px] text-bone-dim">{String(i + 1).padStart(2, "0")}</span>
                                <span className="col-span-3 text-xs text-bone-dim">{fmtDate(r.created_at)}</span>
                                <span className="col-span-3 ltr font-mono text-xs text-bone truncate" dir="ltr">{r.email || `#${r.user_id}`}</span>
                                <span className="col-span-2 ltr font-mono text-sm text-persimmon" dir="ltr">{fmt(r.amount_toman)} T</span>
                                <span className="col-span-1">
                                    {r.status === "resolved" ? <span className="t-chip t-chip-success">OK</span>
                                        : r.status === "rejected" ? <span className="t-chip t-chip-muted">NO</span>
                                            : <span className="t-chip t-chip-warning">PENDING</span>}
                                </span>
                                <span className="col-span-2 text-end">
                                    {r.status === "pending" ? (
                                        <span className="inline-flex gap-2 flex-wrap justify-end">
                                            <button
                                                onClick={() => resolve(r.id)}
                                                aria-label={`تأییدِ بازپرداختِ ${r.email || `#${r.user_id}`}`}
                                                className="t-btn t-btn-primary t-btn-sm"
                                            >
                                                APPROVE
                                            </button>
                                            <button
                                                onClick={() => reject(r.id)}
                                                aria-label={`ردِ بازپرداختِ ${r.email || `#${r.user_id}`}`}
                                                className="t-btn t-btn-danger t-btn-sm"
                                            >
                                                REJECT
                                            </button>
                                        </span>
                                    ) : null}
                                </span>
                            </div>
                            {r.reason ? <div className="mt-2 text-xs text-bone-dim">— {r.reason}</div> : null}
                        </div>
                    ))}
                </StaggerChildren>
            )}
        </main>
    );
}
