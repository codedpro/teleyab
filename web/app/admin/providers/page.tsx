"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollReveal, StaggerChildren } from "@/lib/motion";

type Provider = {
    id: number;
    name: string;
    base_url?: string;
    enabled: boolean;
    priority: number;
    last_ok_at?: string;
    last_err_at?: string;
    last_err?: string;
    created_at: string;
};

function fmtDate(s?: string) {
    if (!s) return "—";
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(s));
}

export default function AdminProviders() {
    const [items, setItems] = useState<Provider[] | null>(null);
    const [draft, setDraft] = useState<{ id?: number; name: string; base_url: string; api_key: string; priority: number; enabled: boolean }>({
        name: "", base_url: "https://example.com", api_key: "", priority: 100, enabled: true,
    });

    const load = () => {
        fetch("/api/admin/providers", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => setItems(j?.providers ?? []));
    };
    useEffect(load, []);

    async function save() {
        await fetch("/api/admin/providers", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
        });
        setDraft({ name: "", base_url: "", api_key: "", priority: 100, enabled: true });
        load();
    }
    async function toggle(id: number) { await fetch(`/api/admin/providers/${id}/toggle`, { method: "POST" }); load(); }
    async function del(id: number) {
        if (!confirm("حذف شود؟")) return;
        await fetch(`/api/admin/providers/${id}`, { method: "DELETE" });
        load();
    }
    function edit(p: Provider) {
        setDraft({ id: p.id, name: p.name, base_url: p.base_url || "", api_key: "", priority: p.priority, enabled: p.enabled });
    }

    return (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="pt-6">
                <Link href="/admin" className="text-bone-soft hover:text-persimmon text-sm">← داشبورد</Link>
            </div>

            <ScrollReveal className="py-8" y={16}>
                <span className="t-chip t-chip-brand mb-3 inline-flex">
                    <span className="dot-live" />
                    UPSTREAM · FAILOVER
                </span>
                <h1 className="display-fa mt-3 text-bone text-3xl md:text-5xl">تامین‌کنندگان.</h1>
                <p className="mt-4 max-w-2xl text-bone-soft leading-loose">
                    ترتیب بر اساسِ <span dir="ltr" className="ltr font-mono text-bone">priority</span> صعودی. اولین تامین‌کنندهٔ سالم پاسخ می‌دهد.
                </p>
            </ScrollReveal>

            {/* Form */}
            <ScrollReveal className="py-6">
                <div className="t-card t-card-pad-lg">
                    <span className="t-chip t-chip-muted mb-4 inline-flex">
                        {draft.id ? "EDIT" : "NEW"} PROVIDER
                    </span>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5 mt-2">
                        <Field label="NAME">
                            <input className="t-input font-mono text-sm" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="primary" />
                        </Field>
                        <Field label="BASE URL">
                            <input className="t-input ltr font-mono text-sm" dir="ltr" value={draft.base_url} onChange={(e) => setDraft({ ...draft, base_url: e.target.value })} placeholder="https://example.com" />
                        </Field>
                        <Field label="API KEY">
                            <input className="t-input ltr font-mono text-sm" dir="ltr" value={draft.api_key} onChange={(e) => setDraft({ ...draft, api_key: e.target.value })} placeholder={draft.id ? "(empty = unchanged)" : ""} />
                        </Field>
                        <Field label="PRIORITY">
                            <input type="number" className="t-input ltr font-mono text-sm" dir="ltr" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) || 0 })} />
                        </Field>
                    </div>
                    <label className="mt-5 inline-flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} className="h-5 w-5 accent-persimmon" />
                        <span className={draft.enabled ? "t-chip t-chip-success" : "t-chip t-chip-muted"}>
                            {draft.enabled ? "ENABLED" : "DISABLED"}
                        </span>
                    </label>
                    <div className="mt-6 flex gap-3">
                        <button onClick={save} disabled={!draft.name} className="t-btn t-btn-primary">
                            {draft.id ? "ذخیره" : "افزودن"}
                        </button>
                        {draft.id ? (
                            <button onClick={() => setDraft({ name: "", base_url: "", api_key: "", priority: 100, enabled: true })} className="t-btn t-btn-ghost">
                                انصراف
                            </button>
                        ) : null}
                    </div>
                </div>
            </ScrollReveal>

            {/* List */}
            <ScrollReveal className="py-6">
                <span className="t-chip t-chip-muted mb-4 inline-flex">REGISTERED · ORDERED BY PRIORITY</span>
                {items === null ? (
                    <div className="t-card t-card-pad text-center text-bone-dim mt-4">…</div>
                ) : items.length === 0 ? (
                    <div className="t-card t-card-pad-lg text-center text-bone-soft mt-4">هنوز تامین‌کننده‌ای نیست.</div>
                ) : (
                    <StaggerChildren className="grid gap-2 mt-4 pb-12" stagger={0.05}>
                        {items.map((p, i) => (
                            <div key={p.id} className="t-card t-card-pad lift">
                                <div className="grid grid-cols-12 items-center gap-3">
                                    <span className="col-span-1 font-mono text-[10px] text-bone-dim">{String(i + 1).padStart(2, "0")}</span>
                                    <span className="col-span-3 text-bone">{p.name}</span>
                                    <span dir="ltr" className="col-span-3 ltr font-mono text-xs text-bone-soft truncate">{p.base_url}</span>
                                    <span className="col-span-1 ltr font-mono text-sm" dir="ltr">{p.priority}</span>
                                    <span className="col-span-1">
                                        {p.enabled ? <span className="t-chip t-chip-success">ON</span> : <span className="t-chip t-chip-muted">OFF</span>}
                                    </span>
                                    <span className="col-span-3 text-end">
                                        <span className="inline-flex gap-2 flex-wrap justify-end">
                                            <button onClick={() => edit(p)} className="t-btn t-btn-ghost t-btn-sm">EDIT</button>
                                            <button onClick={() => toggle(p.id)} className="t-btn t-btn-ghost t-btn-sm">{p.enabled ? "DISABLE" : "ENABLE"}</button>
                                            <button onClick={() => del(p.id)} className="t-btn t-btn-danger t-btn-sm">DELETE</button>
                                        </span>
                                    </span>
                                </div>
                                <div dir="ltr" className="mt-2 ltr font-mono text-[10px] text-bone-dim">
                                    OK · {fmtDate(p.last_ok_at)} · ERR · {fmtDate(p.last_err_at)} {p.last_err ? `· ${p.last_err}` : ""}
                                </div>
                            </div>
                        ))}
                    </StaggerChildren>
                )}
            </ScrollReveal>
        </main>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="t-chip t-chip-muted mb-2 inline-flex">{label}</span>
            <div className="mt-2">{children}</div>
        </label>
    );
}
