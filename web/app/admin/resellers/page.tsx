"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollReveal, StaggerChildren } from "@/lib/motion";

type Reseller = {
    id: number;
    slug: string;
    brand_name?: string;
    markup_pct: number;
    is_active: boolean;
    owner_email: string;
    created_at: string;
};

function fmtDate(s?: string) {
    if (!s) return "—";
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" }).format(new Date(s));
}

export default function AdminResellers() {
    const [items, setItems] = useState<Reseller[] | null>(null);
    const [draft, setDraft] = useState({ owner_email: "", slug: "", brand_name: "", markup_pct: 20 });

    const load = () => {
        fetch("/api/admin/resellers", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => setItems(j?.resellers ?? []));
    };
    useEffect(load, []);

    async function create() {
        await fetch("/api/admin/resellers", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
        });
        setDraft({ owner_email: "", slug: "", brand_name: "", markup_pct: 20 });
        load();
    }

    return (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="pt-6">
                <Link href="/admin" className="text-bone-soft hover:text-persimmon text-sm">← داشبورد</Link>
            </div>

            <ScrollReveal className="py-8" y={16}>
                <span className="t-chip t-chip-brand mb-3 inline-flex">
                    <span className="dot-live" />
                    RESELLERS · WHITE-LABEL
                </span>
                <h1 className="display-fa mt-3 text-bone text-3xl md:text-5xl">نمایندگان.</h1>
                <p className="mt-4 max-w-2xl text-bone-soft leading-loose">
                    هر نماینده slug اختصاصی دارد و درصدِ افزایش قیمتش قابل تنظیم است. این v3 است — منطقِ fronting کامل در فاز بعد.
                </p>
            </ScrollReveal>

            <ScrollReveal className="py-6">
                <div className="t-card t-card-pad-lg">
                    <span className="t-chip t-chip-muted mb-4 inline-flex">NEW RESELLER</span>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5 mt-2">
                        <label className="block">
                            <span className="t-chip t-chip-muted mb-2 inline-flex">OWNER EMAIL</span>
                            <input dir="ltr" className="t-input ltr font-mono mt-2" value={draft.owner_email} onChange={(e) => setDraft({ ...draft, owner_email: e.target.value })} />
                        </label>
                        <label className="block">
                            <span className="t-chip t-chip-muted mb-2 inline-flex">SLUG</span>
                            <input dir="ltr" className="t-input ltr font-mono mt-2" placeholder="acme-co" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                        </label>
                        <label className="block">
                            <span className="t-chip t-chip-muted mb-2 inline-flex">BRAND NAME</span>
                            <input className="t-input mt-2" value={draft.brand_name} onChange={(e) => setDraft({ ...draft, brand_name: e.target.value })} />
                        </label>
                        <label className="block">
                            <span className="t-chip t-chip-muted mb-2 inline-flex">MARKUP · %</span>
                            <input type="number" dir="ltr" className="t-input ltr font-mono mt-2" value={draft.markup_pct} onChange={(e) => setDraft({ ...draft, markup_pct: Number(e.target.value) || 0 })} />
                        </label>
                    </div>
                    <button onClick={create} disabled={!draft.owner_email || !draft.slug} className="mt-6 t-btn t-btn-primary">
                        ساخت
                    </button>
                </div>
            </ScrollReveal>

            <ScrollReveal className="py-6">
                <span className="t-chip t-chip-muted mb-4 inline-flex">REGISTERED</span>
                {items === null ? (
                    <div className="t-card t-card-pad text-center text-bone-dim mt-4">…</div>
                ) : items.length === 0 ? (
                    <div className="t-card t-card-pad-lg text-center text-bone-soft mt-4">هنوز نماینده‌ای نیست.</div>
                ) : (
                    <StaggerChildren className="grid gap-2 mt-4 pb-12" stagger={0.05}>
                        {items.map((r, i) => (
                            <div key={r.id} className="t-card t-card-pad lift">
                                <div className="grid grid-cols-12 items-center gap-3">
                                    <span className="col-span-1 font-mono text-[10px] text-bone-dim">{String(i + 1).padStart(2, "0")}</span>
                                    <span dir="ltr" className="col-span-3 ltr font-mono text-bone">{r.slug}</span>
                                    <span className="col-span-3 text-bone">{r.brand_name || <span className="text-bone-dim">—</span>}</span>
                                    <span dir="ltr" className="col-span-3 ltr font-mono text-xs text-bone-soft truncate">{r.owner_email}</span>
                                    <span className="col-span-1 ltr font-mono text-sm text-persimmon" dir="ltr">{r.markup_pct}%</span>
                                    <span className="col-span-1 text-end">
                                        {r.is_active ? <span className="t-chip t-chip-success">ON</span> : <span className="t-chip t-chip-muted">OFF</span>}
                                    </span>
                                </div>
                                <div className="mt-2 text-[10px] text-bone-dim">{fmtDate(r.created_at)}</div>
                            </div>
                        ))}
                    </StaggerChildren>
                )}
            </ScrollReveal>
        </main>
    );
}
