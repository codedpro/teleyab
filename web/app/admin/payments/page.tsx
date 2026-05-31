"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, Clock, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollReveal, StaggerChildren } from "@/lib/motion";

function fmt(n: number) { return new Intl.NumberFormat("fa-IR").format(Math.round(n)); }

type PaymentRequest = {
    id: number;
    user_id: number;
    email: string;
    amount_toman: number;
    reference_number?: string;
    sender_card?: string;
    has_image: boolean;
    image_url?: string;
    status: "pending" | "approved" | "rejected";
    admin_note?: string;
    created_at: string;
    resolved_at?: string;
};

const TAB_LABELS: Record<string, string> = {
    "": "همه",
    pending: "در انتظار",
    approved: "تأیید شده",
    rejected: "رد شده",
};

export default function AdminPaymentsPage() {
    const [tab, setTab] = useState("pending");
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [note, setNote] = useState<Record<number, string>>({});
    const [busy, setBusy] = useState<number | null>(null);

    function load() {
        setLoading(true);
        fetch(`/api/admin/payments${tab ? `?status=${tab}` : ""}`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (j?.requests) setRequests(j.requests); })
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, [tab]);

    async function act(id: number, action: "approve" | "reject") {
        setBusy(id);
        try {
            const r = await fetch(`/api/admin/payments/${id}/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note: note[id] ?? "" }),
            });
            if (r.ok) {
                setRequests((prev) => prev.filter((x) => x.id !== id));
                setExpanded(null);
            }
        } finally {
            setBusy(null);
        }
    }

    const pendingCount = requests.filter((r) => r.status === "pending").length;

    return (
        <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-10 pb-20 lg:px-8">
            <ScrollReveal className="mb-7" y={16}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <span className="t-chip t-chip-brand mb-3 inline-flex">
                            <span className="dot-live" />
                            PAYMENTS · INBOX
                        </span>
                        <h1 className="display-fa mt-3 text-3xl text-bone">درخواست‌های شارژ</h1>
                        <p className="mt-1 text-sm text-bone-soft">تأیید یا رد واریزهای کارت به کارت</p>
                    </div>
                    <Link href="/admin" className="t-btn t-btn-ghost t-btn-sm">← پنل ادمین</Link>
                </div>
            </ScrollReveal>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 t-card p-1 w-fit">
                {Object.entries(TAB_LABELS).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === key ? "bg-persimmon text-white" : "text-bone-soft hover:text-bone"}`}
                    >
                        {label}
                        {key === "pending" && pendingCount > 0 && tab !== "pending" && (
                            <span className="ml-1.5 inline-flex size-5 rounded-full bg-rose/20 text-rose items-center justify-center text-xs">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="t-card t-card-pad text-center text-bone-dim">در حال بارگذاری…</div>
            ) : requests.length === 0 ? (
                <div className="t-card t-card-pad-lg text-center text-bone-dim">درخواستی موجود نیست</div>
            ) : (
                <StaggerChildren className="grid gap-3" stagger={0.05}>
                    {requests.map((req) => (
                        <div key={req.id} className="t-card lift">
                            {/* Header row */}
                            <button
                                type="button"
                                onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                                className="w-full p-4 flex items-center gap-3 text-start"
                            >
                                {req.status === "approved" ? <CheckCircle className="size-5 text-jade shrink-0" /> :
                                    req.status === "rejected" ? <XCircle className="size-5 text-rose shrink-0" /> :
                                        <Clock className="size-5 text-amber shrink-0" />}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-bone font-mono">{fmt(req.amount_toman)} ت</span>
                                        <span className="text-xs text-bone-dim">{req.email}</span>
                                        {req.status === "pending" && (
                                            <span className="t-chip t-chip-warning">در انتظار</span>
                                        )}
                                        {req.status === "approved" && (
                                            <span className="t-chip t-chip-success">تأیید شد</span>
                                        )}
                                        {req.status === "rejected" && (
                                            <span className="t-chip t-chip-danger">رد شد</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-bone-dim">
                                        <span>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(req.created_at))}</span>
                                        {req.reference_number && (
                                            <span dir="ltr" className="font-mono">ref: {req.reference_number}</span>
                                        )}
                                        {req.has_image && (
                                            <span className="text-persimmon">رسید</span>
                                        )}
                                    </div>
                                </div>
                                {expanded === req.id ? <ChevronUp className="size-4 text-bone-dim shrink-0" /> : <ChevronDown className="size-4 text-bone-dim shrink-0" />}
                            </button>

                            {/* Expanded detail */}
                            {expanded === req.id && (
                                <div className="border-t border-rule-soft p-4 space-y-4">
                                    <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <dt className="text-xs text-bone-dim mb-0.5">کاربر</dt>
                                            <dd className="font-mono text-bone">{req.email}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-bone-dim mb-0.5">مبلغ</dt>
                                            <dd className="font-bold text-bone font-mono">{fmt(req.amount_toman)} تومان</dd>
                                        </div>
                                        {req.reference_number && (
                                            <div>
                                                <dt className="text-xs text-bone-dim mb-0.5">شماره پیگیری</dt>
                                                <dd dir="ltr" className="font-mono text-bone">{req.reference_number}</dd>
                                            </div>
                                        )}
                                        {req.sender_card && (
                                            <div>
                                                <dt className="text-xs text-bone-dim mb-0.5">کارت فرستنده</dt>
                                                <dd dir="ltr" className="font-mono text-bone">{req.sender_card}</dd>
                                            </div>
                                        )}
                                        {req.admin_note && (
                                            <div className="sm:col-span-2">
                                                <dt className="text-xs text-bone-dim mb-0.5">یادداشت قبلی</dt>
                                                <dd className="text-bone">{req.admin_note}</dd>
                                            </div>
                                        )}
                                    </dl>

                                    {/* Receipt image */}
                                    {req.has_image && req.image_url && (
                                        <div>
                                            <p className="text-xs text-bone-dim mb-2">تصویر رسید</p>
                                            <a href={req.image_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-persimmon text-sm hover:underline">
                                                <ExternalLink className="size-4" />
                                                مشاهده رسید
                                            </a>
                                        </div>
                                    )}

                                    {req.status === "pending" && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-bone-soft mb-1.5">یادداشت (اختیاری)</label>
                                                <input
                                                    type="text"
                                                    className="t-input text-sm"
                                                    placeholder="دلیل رد یا توضیح…"
                                                    value={note[req.id] ?? ""}
                                                    onChange={(e) => setNote((prev) => ({ ...prev, [req.id]: e.target.value }))}
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    disabled={busy === req.id}
                                                    onClick={() => act(req.id, "approve")}
                                                    className="t-btn t-btn-primary flex-1"
                                                >
                                                    <CheckCircle className="size-4" />
                                                    {busy === req.id ? "در حال پردازش…" : `تأیید و شارژ — ${fmt(req.amount_toman)} ت`}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy === req.id}
                                                    onClick={() => act(req.id, "reject")}
                                                    className="t-btn t-btn-ghost"
                                                >
                                                    <XCircle className="size-4 text-rose" />
                                                    رد
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </StaggerChildren>
            )}
        </main>
    );
}
