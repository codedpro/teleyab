"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScrollReveal, StaggerChildren, CountUp } from "@/lib/motion";

type Tx = { id: number; amount_toman: number; kind: string; reference?: string; created_at: string };
type Lk = {
    id: number;
    query: string;
    success: boolean;
    country?: string;
    numbers?: string[];
    error?: string;
    cost_toman: number;
    created_at: string;
};

type Detail = {
    id: number;
    email: string;
    role: string;
    balance_toman: number;
    banned_at?: string;
    flagged_at?: string;
    ban_reason?: string;
    flag_reason?: string;
    created_at: string;
    last_login_at?: string;
    lookups: Lk[];
    transactions: Tx[];
};

function fmt(n: number) {
    return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}
function fmtDate(s?: string) {
    if (!s) return "—";
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(s));
}

export default function UserDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [u, setU] = useState<Detail | null>(null);
    const [adjAmount, setAdjAmount] = useState<number>(0);
    const [adjReason, setAdjReason] = useState("");

    const load = () => {
        fetch(`/api/admin/users/${id}`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then(setU);
    };
    useEffect(load, [id]);

    async function ban() {
        const reason = prompt("دلیل مسدودسازی؟") || "";
        await fetch(`/api/admin/users/${id}/ban`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
        });
        load();
    }
    async function unban() {
        await fetch(`/api/admin/users/${id}/unban`, { method: "POST" });
        load();
    }
    async function forceLogout() {
        if (!confirm("همهٔ نشست‌های کاربر را پایان دهیم؟")) return;
        await fetch(`/api/admin/users/${id}/force-logout`, { method: "POST" });
        load();
    }
    async function adjust() {
        if (!adjAmount) return;
        await fetch(`/api/admin/users/${id}/adjust`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount_toman: adjAmount, reason: adjReason }),
        });
        setAdjAmount(0);
        setAdjReason("");
        load();
    }

    if (!u) {
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

    return (
        <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-20 lg:px-8">
            <Link href="/admin/users" className="inline-flex items-center gap-1 text-bone-soft hover:text-persimmon text-sm">
                <ArrowLeft className="size-3.5 rtl:rotate-180" />
                همهٔ کاربران
            </Link>

            {/* Header */}
            <ScrollReveal className="mt-6 grid gap-8 md:grid-cols-3 items-start">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="t-chip t-chip-brand">
                            <span className="dot-live" />
                            کاربر · #{u.id}
                        </span>
                        {u.role === "admin" ? <span className="t-chip t-chip-brand">ادمین</span> : null}
                        {u.banned_at ? <span className="t-chip t-chip-danger">مسدود</span> : null}
                        {u.flagged_at ? <span className="t-chip t-chip-warning">نشان‌شده</span> : null}
                    </div>
                    <p dir="ltr" className="font-mono text-2xl md:text-3xl font-extrabold text-bone break-all">
                        {u.email}
                    </p>
                    <p className="mt-2 text-bone-dim text-xs">
                        عضو از {fmtDate(u.created_at)} · آخرین ورود {fmtDate(u.last_login_at)}
                    </p>
                    {u.ban_reason ? (
                        <p className="mt-3 text-rose text-sm" dir="ltr">
                            ban · {u.ban_reason}
                        </p>
                    ) : null}
                    {u.flag_reason ? (
                        <p className="mt-1 text-amber text-sm" dir="ltr">
                            flag · {u.flag_reason}
                        </p>
                    ) : null}

                    <div className="mt-6 flex flex-wrap gap-2">
                        {u.banned_at ? (
                            <button onClick={unban} className="t-btn t-btn-success t-btn-sm">
                                رفعِ مسدودی
                            </button>
                        ) : (
                            <button onClick={ban} className="t-btn t-btn-danger t-btn-sm">
                                مسدودسازی
                            </button>
                        )}
                        <button onClick={forceLogout} className="t-btn t-btn-ghost t-btn-sm">
                            خروجِ اجباری
                        </button>
                    </div>
                </div>
                <div className="t-card t-card-pad-lg text-center">
                    <div className="text-[11px] text-bone-dim mb-1">موجودی</div>
                    <div className="text-4xl font-extrabold text-persimmon">
                        <CountUp to={u.balance_toman} />
                    </div>
                    <div className="text-[11px] text-bone-dim mt-1">تومان</div>
                </div>
            </ScrollReveal>

            {/* Adjust */}
            <ScrollReveal className="mt-10 t-card t-card-pad-lg">
                <div className="flex items-center gap-2 mb-4">
                    <span className="t-chip t-chip-muted">تنظیمِ دستی</span>
                </div>
                <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3">
                    <input
                        type="number"
                        className="t-input font-mono text-start"
                        placeholder="+ یا -  مبلغ به تومان"
                        value={adjAmount || ""}
                        onChange={(e) => setAdjAmount(Number(e.target.value) || 0)}
                    />
                    <input
                        className="t-input"
                        placeholder="دلیل (ثبت می‌شود)"
                        value={adjReason}
                        onChange={(e) => setAdjReason(e.target.value)}
                    />
                    <button onClick={adjust} disabled={!adjAmount} className="t-btn t-btn-primary">
                        اعمال
                    </button>
                </div>
            </ScrollReveal>

            {/* Timeline */}
            <section className="mt-10 grid gap-8 lg:grid-cols-2">
                <ScrollReveal>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="t-chip t-chip-muted">جست‌و‌جوهای اخیر</span>
                        <span className="text-xs text-bone-dim">{fmt(u.lookups.length)}</span>
                    </div>
                    <StaggerChildren stagger={0.04} className="space-y-2">
                        {u.lookups.map((l, i) => (
                            <div
                                key={l.id}
                                className="t-card lift grid grid-cols-12 items-center gap-2 px-3 py-2.5"
                            >
                                <span className="col-span-1 font-mono text-[10px] text-whisper">
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <span className="col-span-3 text-[11px] text-bone-dim">{fmtDate(l.created_at)}</span>
                                <span dir="ltr" className="col-span-4 font-mono text-xs text-bone truncate">
                                    {l.query}
                                </span>
                                <span className="col-span-2">
                                    {l.success ? (
                                        <span className="t-chip t-chip-success text-[10px] px-2 py-0.5">یافت شد</span>
                                    ) : (
                                        <span className="t-chip t-chip-muted text-[10px] px-2 py-0.5">یافت نشد</span>
                                    )}
                                </span>
                                <span dir="ltr" className="col-span-2 font-mono text-xs text-end text-bone">
                                    {l.cost_toman > 0 ? fmt(l.cost_toman) : "—"}
                                </span>
                            </div>
                        ))}
                        {u.lookups.length === 0 ? (
                            <div className="t-card t-card-pad text-center text-bone-dim text-sm">—</div>
                        ) : null}
                    </StaggerChildren>
                </ScrollReveal>

                <ScrollReveal>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="t-chip t-chip-muted">دفترِ کیف‌پول</span>
                        <span className="text-xs text-bone-dim">{fmt(u.transactions.length)}</span>
                    </div>
                    <StaggerChildren stagger={0.04} className="space-y-2">
                        {u.transactions.map((t, i) => (
                            <div
                                key={t.id}
                                className="t-card lift grid grid-cols-12 items-center gap-2 px-3 py-2.5"
                            >
                                <span className="col-span-1 font-mono text-[10px] text-whisper">
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <span className="col-span-3 text-[11px] text-bone-dim">{fmtDate(t.created_at)}</span>
                                <span className="col-span-2">
                                    <span className="t-chip t-chip-muted text-[10px] px-2 py-0.5">{t.kind}</span>
                                </span>
                                <span
                                    dir="ltr"
                                    className={`col-span-3 font-mono text-xs font-bold ${
                                        t.amount_toman < 0 ? "text-rose" : "text-jade"
                                    }`}
                                >
                                    {t.amount_toman > 0 ? "+" : ""}
                                    {fmt(t.amount_toman)}
                                </span>
                                <span dir="ltr" className="col-span-3 font-mono text-[10px] text-whisper truncate">
                                    {t.reference || "—"}
                                </span>
                            </div>
                        ))}
                        {u.transactions.length === 0 ? (
                            <div className="t-card t-card-pad text-center text-bone-dim text-sm">—</div>
                        ) : null}
                    </StaggerChildren>
                </ScrollReveal>
            </section>
        </main>
    );
}
