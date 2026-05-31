"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthFrame } from "@/components/auth-frame";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            const r = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });
            // Server always returns 200 on this endpoint (anti-enumeration); we
            // only check for transport failure.
            if (!r.ok) {
                const j = await r.json().catch(() => null);
                setErr(j?.message ?? "ارسالِ لینک ناموفق بود");
                setBusy(false);
                return;
            }
            setDone(true);
        } catch {
            setErr("اتصال برقرار نشد");
            setBusy(false);
        }
    }

    const footer = (
        <div className="flex items-center justify-between">
            <Link href="/login" className="hover:text-persimmon">← بازگشت به ورود</Link>
            <Link href="/" className="hover:text-persimmon">خانه</Link>
        </div>
    );

    if (done) {
        return (
            <AuthFrame
                eyebrow="بازنشانیِ رمز"
                title="ایمیلت را چک کن."
                footer={footer}
            >
                <style>{`
                    @keyframes badge-pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    @keyframes check-draw { from { stroke-dashoffset: 30; } to { stroke-dashoffset: 0; } }
                `}</style>
                <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 -m-3 rounded-full bg-jade/25 blur-2xl glow-pulse" />
                    <div
                        className="relative size-14 rounded-full bg-jade/15 text-jade flex items-center justify-center"
                        style={{ animation: "badge-pop 0.55s cubic-bezier(0.22, 1.4, 0.36, 1) both" }}
                    >
                        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline
                                points="5 13 10 18 19 7"
                                style={{
                                    strokeDasharray: 30,
                                    strokeDashoffset: 30,
                                    animation: "check-draw 0.55s ease-out 0.3s forwards",
                                }}
                            />
                        </svg>
                    </div>
                </div>
                <h2 className="text-2xl font-extrabold text-bone">لینکِ بازنشانی ارسال شد.</h2>
                <p className="mt-3 text-bone-soft text-sm leading-loose">
                    اگر این ایمیل در پایگاهِ ما باشد، تا یک دقیقهٔ دیگر پیامی به{" "}
                    <span dir="ltr" className="font-mono text-bone">{email.trim()}</span>{" "}
                    می‌رسد. روی لینکِ داخلِ ایمیل بزن تا رمزِ جدیدت را بسازی.
                </p>
                <p className="mt-3 text-bone-dim text-xs leading-loose">
                    لینک یک ساعت معتبر است. اگر چیزی نرسید، پوشهٔ اسپم را هم چک کن.
                </p>
                <Link href="/login" className="mt-6 t-btn t-btn-primary w-full">
                    بازگشت به ورود
                </Link>
            </AuthFrame>
        );
    }

    return (
        <AuthFrame
            eyebrow="رمزِ عبور را فراموش کردی؟"
            title="ایمیلت را بنویس."
            epigraph="لینکِ بازنشانی می‌فرستیم. یک ساعت وقت داری."
            footer={footer}
        >
            <form onSubmit={submit} className="space-y-4">
                <label className="block">
                    <span className="block text-xs font-bold text-bone-soft mb-1.5">ایمیل</span>
                    <input
                        type="email"
                        required
                        autoFocus
                        dir="ltr"
                        placeholder="you@example.com"
                        className="t-input t-input-lg font-mono"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </label>

                {err ? (
                    <p className="text-rose text-sm flex items-center gap-1.5 animate-[wiggle_0.3s_ease-in-out]">
                        <style>{`@keyframes wiggle { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }`}</style>
                        <span className="size-1.5 rounded-full bg-rose" /> {err}
                    </p>
                ) : null}

                <button
                    type="submit"
                    disabled={busy || !email}
                    className="t-btn t-btn-primary t-btn-lg w-full"
                >
                    {busy ? (
                        <span className="inline-flex items-center gap-2">
                            <span className="typing-dot" />
                            <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                            <span className="typing-dot" style={{ animationDelay: "0.30s" }} />
                            در حالِ ارسال
                        </span>
                    ) : (
                        "ارسالِ لینکِ بازنشانی"
                    )}
                </button>

                <p className="text-center text-xs text-bone-dim">
                    یادت آمد؟{" "}
                    <Link href="/login" className="text-persimmon hover:underline">
                        وارد شو
                    </Link>
                </p>
            </form>
        </AuthFrame>
    );
}
