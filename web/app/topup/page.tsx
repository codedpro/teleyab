"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Upload, X, Send, Clock, CheckCircle, XCircle, Wallet, Copy, ImageIcon } from "lucide-react";
import { ScrollReveal, StaggerChildren } from "@/lib/motion";
import { ChatBubble, ChatShell, ChatStream } from "@/components/chat";
import { BreadcrumbLD } from "@/components/schema-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

const PRESETS = [200_000, 500_000, 1_000_000, 2_000_000];

function fmt(n: number) { return new Intl.NumberFormat("fa-IR").format(Math.round(n)); }

type Me = { email?: string; balance_toman?: number; price_per_lookup_toman?: number };

type BankInfo = {
    bank_card_number?: string;
    bank_card_holder?: string;
    bank_name?: string;
    min_topup_toman?: number;
    max_topup_toman?: number;
};

type PaymentRequest = {
    id: number;
    amount_toman: number;
    reference_number?: string;
    sender_card?: string;
    has_image: boolean;
    status: "pending" | "approved" | "rejected";
    admin_note?: string;
    created_at: string;
};

function statusMeta(s: PaymentRequest["status"]) {
    if (s === "approved") return { text: "تأیید شد", color: "text-jade", bg: "bg-jade/15", Icon: CheckCircle };
    if (s === "rejected") return { text: "رد شد", color: "text-rose", bg: "bg-rose/15", Icon: XCircle };
    return { text: "در حالِ پردازش", color: "text-saffron", bg: "bg-saffron/15", Icon: Clock };
}

export default function TopupPage() {
    return (
        <Suspense fallback={null}>
            <TopupInner />
        </Suspense>
    );
}

// Default fallback when no URL hint is provided. Matches the cheapest
// quick-charge preset on /pricing (one successful lookup at the current
// minimum). When admin lowers the per-lookup price, the preset row on
// /pricing updates live too, so the two stay aligned.
const DEFAULT_AMOUNT = 800_000;

function parseAmountParam(raw: string | null): number {
    if (!raw) return DEFAULT_AMOUNT;
    // Strip thousand separators (e.g. "2,400,000" or "2.400.000") and trim.
    const cleaned = raw.replace(/[,_\s.]/g, "");
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_AMOUNT;
    // Clamp to a sensible range so URL tampering can't preload a billion.
    return Math.min(Math.max(Math.round(n), 1_000), 100_000_000);
}

function TopupInner() {
    const params = useSearchParams();
    const initialAmount = parseAmountParam(params.get("amount"));
    const [me, setMe] = useState<Me | null>(null);
    const [bank, setBank] = useState<BankInfo | null>(null);
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [amount, setAmount] = useState(initialAmount);
    const [refNum, setRefNum] = useState("");
    const [senderCard, setSenderCard] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [success, setSuccess] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch("/api/me", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then(setMe);
        fetch("/api/public/pricing", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (j) setBank({
                    bank_card_number: j.bank_card_number,
                    bank_card_holder: j.bank_card_holder,
                    bank_name: j.bank_name,
                    min_topup_toman: j.min_topup_toman,
                    max_topup_toman: j.max_topup_toman,
                });
            });
        fetch("/api/topup/requests", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (j?.requests) setRequests(j.requests); });
    }, []);

    function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        setImageFile(f);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target?.result as string);
        reader.readAsDataURL(f);
    }

    function removeImage() {
        setImageFile(null);
        setImagePreview(null);
        if (fileRef.current) fileRef.current.value = "";
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            const fd = new FormData();
            fd.append("amount_toman", String(amount));
            if (refNum.trim()) fd.append("reference_number", refNum.trim());
            if (senderCard.trim()) fd.append("sender_card", senderCard.trim());
            if (imageFile) fd.append("receipt_image", imageFile);

            const r = await fetch("/api/topup/request", { method: "POST", body: fd });
            const j = await r.json().catch(() => null);
            if (!r.ok) {
                setErr(j?.message ?? "ارسال درخواست ناموفق بود");
                setBusy(false);
                return;
            }
            setSuccess(true);
            setRefNum("");
            setSenderCard("");
            removeImage();
            fetch("/api/topup/requests", { cache: "no-store" })
                .then((r) => (r.ok ? r.json() : null))
                .then((j) => { if (j?.requests) setRequests(j.requests); });
        } catch {
            setErr("اتصال برقرار نشد");
        } finally {
            setBusy(false);
        }
    }

    function copyCard() {
        if (bank?.bank_card_number) {
            navigator.clipboard.writeText(bank.bank_card_number.replace(/-/g, "")).catch(() => null);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    const lookupsBought = me?.price_per_lookup_toman ? Math.floor(amount / me.price_per_lookup_toman) : 0;
    const minA = bank?.min_topup_toman ?? 100_000;
    const maxA = bank?.max_topup_toman ?? 25_000_000;

    return (
        <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-20 lg:px-8">
            <BreadcrumbLD
                siteUrl={SITE_URL}
                items={[
                    { name: "خانه", url: SITE_URL + "/" },
                    { name: "شارژ", url: SITE_URL + "/topup" },
                ]}
            />
            <style>{`
                @keyframes badge-pop {
                    0% { transform: scale(0.6); opacity: 0; }
                    60% { transform: scale(1.08); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .badge-pop { animation: badge-pop 0.55s cubic-bezier(.34,1.56,.64,1) both; }
            `}</style>

            {/* Header */}
            <header className="mb-8">
                <ScrollReveal>
                    <span className="t-chip t-chip-brand mb-4">
                        <Wallet className="size-3" />
                        کیف‌پولِ تومانی
                    </span>
                </ScrollReveal>
                <ScrollReveal delay={0.05}>
                    <h1 className="display-fa text-3xl sm:text-5xl text-bone leading-tight">
                        شارژِ کیف‌پول.
                    </h1>
                </ScrollReveal>
                <ScrollReveal delay={0.1}>
                    <p className="mt-3 text-bone-soft text-sm flex items-center gap-2 flex-wrap">
                        موجودی فعلی:
                        <span dir="ltr" className="font-bold text-bone font-mono">{fmt(me?.balance_toman ?? 0)}</span>
                        <span>تومان</span>
                    </p>
                </ScrollReveal>
            </header>

            {/* Card-to-card instructions as a chat */}
            {bank?.bank_card_number && (
                <ScrollReveal className="mb-8">
                    <ChatShell
                        subtitle="راهنمای کارت‌به‌کارت"
                        footer={
                            <>
                                <span>سه قدم</span>
                                <span dir="ltr" className="font-mono font-bold text-persimmon-deep">
                                    1 → 2 → 3
                                </span>
                            </>
                        }
                    >
                        <ChatStream>
                            <ChatBubble side="them" tone="brand" timestamp="20:14">
                                <div className="text-xs font-bold opacity-90 mb-1">قدم ۱</div>
                                <div className="text-sm">شمارهٔ کارت را کپی کن</div>
                            </ChatBubble>
                            <ChatBubble side="them" tone="neutral" timestamp="20:14">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span dir="ltr" className="font-mono text-base sm:text-lg font-extrabold tracking-widest text-bone">
                                        {bank.bank_card_number}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={copyCard}
                                        className="t-btn t-btn-ghost t-btn-sm"
                                    >
                                        <Copy className="size-3" />
                                        {copied ? "کپی شد ✓" : "کپی"}
                                    </button>
                                </div>
                                {bank.bank_card_holder && (
                                    <div className="text-[11px] text-bone-dim mt-1.5">
                                        به نام: <span className="font-bold text-bone-soft">{bank.bank_card_holder}</span>
                                        {bank.bank_name ? <span className="ms-2">· {bank.bank_name}</span> : null}
                                    </div>
                                )}
                            </ChatBubble>
                            <ChatBubble side="them" tone="brand" timestamp="20:14">
                                <div className="text-xs font-bold opacity-90 mb-1">قدم ۲</div>
                                <div className="text-sm">مبلغ را به این کارت واریز کن</div>
                            </ChatBubble>
                            <ChatBubble side="them" tone="brand" timestamp="20:14">
                                <div className="text-xs font-bold opacity-90 mb-1">قدم ۳</div>
                                <div className="text-sm">رسید را آپلود کن — تأییدِ دستی توسط ادمین</div>
                            </ChatBubble>
                        </ChatStream>
                    </ChatShell>
                </ScrollReveal>
            )}

            {/* Form */}
            <form onSubmit={submit} className="space-y-6">
                {/* Composer-style amount input */}
                <ScrollReveal className="t-card t-card-pad-lg">
                    <div className="flex items-end justify-between mb-3">
                        <span className="text-xs font-bold text-bone-soft">مبلغ شارژ</span>
                        <span className="text-xs text-bone-dim">
                            حداقل {fmt(minA)} · حداکثر {fmt(maxA)}
                        </span>
                    </div>

                    {/* Preset chips */}
                    <StaggerChildren className="flex flex-wrap gap-2 mb-4" stagger={0.06}>
                        {PRESETS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setAmount(p)}
                                className={`t-chip transition-colors ${
                                    amount === p
                                        ? "t-chip-brand"
                                        : "t-chip-muted hover:bg-persimmon-soft hover:text-persimmon-deep"
                                }`}
                            >
                                {fmt(p)} ت
                            </button>
                        ))}
                    </StaggerChildren>

                    {/* Telegram-style composer */}
                    <div className="relative">
                        <div className="flex items-center gap-2 rounded-full border border-rule-soft bg-night-700/40 focus-within:border-persimmon focus-within:bg-white focus-within:shadow-[0_0_0_4px_var(--color-persimmon-soft)] transition px-2 py-2">
                            <span className="text-xs font-bold text-bone-dim ps-2">مبلغ</span>
                            <input
                                dir="ltr"
                                type="number"
                                min={minA}
                                max={maxA}
                                step={10_000}
                                className="flex-1 h-9 bg-transparent px-3 font-mono text-lg font-bold focus:outline-none placeholder:text-whisper text-bone text-end"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                                placeholder="800000"
                            />
                            <span className="text-xs font-bold text-bone-dim pe-2">تومان</span>
                        </div>
                        {me?.price_per_lookup_toman && lookupsBought > 0 ? (
                            <p className="mt-3 text-xs text-bone-dim text-center">
                                ≈ <span className="font-bold text-bone font-mono">{fmt(lookupsBought)}</span> جست‌و‌جوی موفق با این شارژ
                            </p>
                        ) : null}
                    </div>
                </ScrollReveal>

                {/* Reference + sender card */}
                <ScrollReveal className="t-card t-card-pad space-y-4">
                    <label className="block">
                        <span className="block text-xs font-bold text-bone-soft mb-1.5">شماره پیگیری / شناسه واریز</span>
                        <input
                            type="text"
                            className="t-input font-mono text-start"
                            placeholder="شماره مرجع یا کد پیگیری از بانک"
                            value={refNum}
                            onChange={(e) => setRefNum(e.target.value)}
                        />
                    </label>

                    <label className="block">
                        <span className="block text-xs font-bold text-bone-soft mb-1.5">شماره کارت فرستنده</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            className="t-input font-mono text-start"
                            placeholder="۱۶ رقم یا ۴ رقم آخر"
                            maxLength={19}
                            value={senderCard}
                            onChange={(e) => setSenderCard(e.target.value)}
                        />
                    </label>
                </ScrollReveal>

                {/* Upload zone */}
                <ScrollReveal>
                    <span className="block text-xs font-bold text-bone-soft mb-2">تصویر رسید (اختیاری)</span>
                    {imagePreview ? (
                        <div className="relative inline-flex items-center gap-3 t-card t-card-pad">
                            {imageFile?.type === "application/pdf" ? (
                                <div className="flex items-center gap-2">
                                    <div className="size-10 rounded-lg bg-persimmon-soft text-persimmon-deep grid place-items-center">
                                        <ImageIcon className="size-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-bone">{imageFile?.name}</div>
                                        <span className="t-chip t-chip-success mt-1 badge-pop">✓ ضمیمه شد</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <img
                                        src={imagePreview}
                                        alt="پیش‌نمایش رسیدِ بانکی"
                                        className="h-24 w-auto rounded-xl border border-rule-soft object-cover"
                                    />
                                    <span className="t-chip t-chip-success badge-pop">✓ رسید ضمیمه شد</span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={removeImage}
                                className="absolute -top-2 -inset-e-2 size-6 rounded-full bg-rose text-white flex items-center justify-center hover:scale-110 transition"
                                aria-label="حذف"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="blob-drift absolute -top-4 -inset-e-4 size-32 rounded-full bg-persimmon-soft/40 blur-2xl pointer-events-none" aria-hidden />
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="relative flex items-center gap-2 border-2 border-dashed border-persimmon/30 rounded-2xl px-4 py-6 text-sm text-bone-soft hover:border-persimmon hover:bg-persimmon-soft/30 hover:text-persimmon-deep transition-colors w-full justify-center"
                            >
                                <Upload className="size-4" />
                                <span className="font-bold">آپلود تصویر یا PDF رسید</span>
                            </button>
                        </div>
                    )}
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={pickImage}
                    />
                </ScrollReveal>

                {success && (
                    <div className="t-chip t-chip-success w-full justify-center badge-pop">
                        ✓ درخواستِ شارژ ثبت شد — به زودی موجودیت شارژ می‌شود
                    </div>
                )}

                {err ? <p className="text-rose text-sm">{err}</p> : null}

                <button
                    type="submit"
                    disabled={busy || amount < minA || amount > maxA}
                    className="t-btn t-btn-primary t-btn-lg w-full"
                >
                    <Send className="size-4 rtl:rotate-180" />
                    {busy ? "در حال ارسال…" : `ثبتِ درخواست — ${fmt(amount)} تومان`}
                </button>
            </form>

            {/* History */}
            {requests.length > 0 && (
                <ScrollReveal className="mt-10">
                    <h2 className="display-fa text-2xl text-bone mb-4">درخواست‌های قبلی</h2>
                    <StaggerChildren className="space-y-3" stagger={0.08}>
                        {requests.map((req) => {
                            const { text, color, bg, Icon } = statusMeta(req.status);
                            return (
                                <div key={req.id} className="t-card t-card-pad flex items-start gap-3 relative overflow-hidden">
                                    <div className={`glow-pulse absolute -top-6 -inset-s-6 size-20 rounded-full ${bg} blur-2xl pointer-events-none`} aria-hidden />
                                    <div className={`relative size-10 rounded-full ${bg} ${color} grid place-items-center shrink-0`}>
                                        <Icon className="size-5" />
                                    </div>
                                    <div className="relative flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-bone font-mono">{fmt(req.amount_toman)} تومان</span>
                                            <span className={`badge-pop text-xs font-bold ${color}`}>· {text}</span>
                                        </div>
                                        {req.reference_number && (
                                            <p dir="ltr" className="text-xs text-bone-dim font-mono mt-0.5">ref: {req.reference_number}</p>
                                        )}
                                        {req.admin_note && (
                                            <p className="text-xs text-bone-soft mt-1">یادداشت ادمین: {req.admin_note}</p>
                                        )}
                                        <p className="text-xs text-bone-dim mt-1">
                                            {new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(req.created_at))}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </StaggerChildren>
                </ScrollReveal>
            )}

            <div className="mt-10 text-center">
                <Link href="/wallet" className="text-persimmon hover:underline text-sm">
                    تاریخچهٔ کامل کیف‌پول →
                </Link>
            </div>
        </main>
    );
}
