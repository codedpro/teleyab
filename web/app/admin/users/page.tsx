"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollReveal, StaggerChildren } from "@/lib/motion";

type User = {
    id: number;
    email: string;
    role: string;
    balance_toman: number;
    banned_at?: string;
    flagged_at?: string;
    created_at: string;
    last_login_at?: string;
};

function fmt(n: number) { return new Intl.NumberFormat("fa-IR").format(Math.round(n)); }
function fmtDate(s?: string) {
    if (!s) return "—";
    return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "short", day: "numeric" }).format(new Date(s));
}

export default function AdminUsers() {
    const [users, setUsers] = useState<User[] | null>(null);
    const [q, setQ] = useState("");

    useEffect(() => { load(""); }, []);

    function load(query: string) {
        const url = query ? `/api/admin/users?q=${encodeURIComponent(query)}` : "/api/admin/users";
        fetch(url, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => setUsers(j?.users ?? []));
    }

    return (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="pt-6">
                <Link href="/admin" className="text-bone-soft hover:text-persimmon text-sm">← داشبورد</Link>
            </div>

            <ScrollReveal className="py-8" y={16}>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <span className="t-chip t-chip-brand mb-3 inline-flex">
                            <span className="dot-live" />
                            USERS · LEDGER
                        </span>
                        <h1 className="display-fa mt-3 text-3xl text-bone md:text-5xl">کاربران.</h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <input
                            className="t-input ltr font-mono"
                            dir="ltr"
                            placeholder="search · email…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && load(q)}
                        />
                        <button onClick={() => load(q)} className="t-btn t-btn-primary">
                            جست‌و‌جو
                        </button>
                    </div>
                </div>
            </ScrollReveal>

            {users === null ? (
                <div className="t-card t-card-pad text-center text-bone-dim">…</div>
            ) : users.length === 0 ? (
                <div className="t-card t-card-pad-lg text-center text-bone-soft">نتیجه‌ای نیست.</div>
            ) : (
                <StaggerChildren className="grid gap-2 pb-12" stagger={0.04}>
                    {users.map((u, i) => (
                        <Link
                            key={u.id}
                            href={`/admin/users/${u.id}`}
                            className="t-card t-card-pad lift group grid grid-cols-12 items-center gap-3"
                        >
                            <span className="col-span-1 font-mono text-[10px] text-bone-dim">{String(i + 1).padStart(2, "0")}</span>
                            <span className="col-span-4 ltr font-mono text-sm text-bone group-hover:text-persimmon truncate" dir="ltr">{u.email}</span>
                            <span className="col-span-1">
                                {u.role === "admin"
                                    ? <span className="t-chip t-chip-brand">ADMIN</span>
                                    : <span className="t-chip t-chip-muted">USER</span>}
                            </span>
                            <span className="col-span-2 ltr font-mono text-sm text-end text-bone" dir="ltr">{fmt(u.balance_toman)} T</span>
                            <span className="col-span-2">
                                {u.banned_at ? <span className="t-chip t-chip-danger">BANNED</span>
                                    : u.flagged_at ? <span className="t-chip t-chip-warning">FLAGGED</span>
                                        : <span className="t-chip t-chip-success">OK</span>}
                            </span>
                            <span className="col-span-2 text-xs text-bone-dim text-end">{fmtDate(u.last_login_at)}</span>
                        </Link>
                    ))}
                </StaggerChildren>
            )}
        </main>
    );
}
