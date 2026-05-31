"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordInner />
        </Suspense>
    );
}

function ResetPasswordInner() {
    const params = useSearchParams();
    const router = useRouter();
    const token = params.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const footer = (
        <div className="flex items-center justify-between">
            <Link href="/login" className="hover:text-persimmon">← بازگشت به ورود</Link>
            <Link href="/forgot-password" className="hover:text-persimmon">لینکِ تازه</Link>
        </div>
    );

    // No token → render a clean "invalid link" state. This also catches the
    // case where the user lands here by mistyping the URL.
    if (!token) {
        return (
            <AuthFrame
                eyebrow="بازنشانیِ رمز"
                title="لینک نامعتبر است."
                footer={footer}
            >
                <style>{`@keyframes badge-pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
                <div
                    className="size-14 rounded-full bg-rose/15 text-rose text-2xl flex items-center justify-center mb-4"
                    style={{ animation: "badge-pop 0.4s ease-out both" }}
                >
                    ✕
                </div>
                <p className="text-bone-soft text-sm leading-loose">
                    این صفحه فقط با لینکِ بازنشانی که به ایمیلت ارسال شده باز می‌شود. اگر لینک قدیمی است یا توکن گم شده، یک لینکِ تازه بگیر.
                </p>
                <Link href="/forgot-password" className="mt-6 t-btn t-btn-primary w-full">
                    درخواستِ لینکِ تازه
                </Link>
            </AuthFrame>
        );
    }

    if (done) {
        return (
            <AuthFrame
                eyebrow="بازنشانیِ رمز"
                title="رمزِ جدید ثبت شد."
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
                <p className="text-bone-soft text-sm leading-loose">
                    رمزِ عبورت عوض شد و از همهٔ دستگاه‌ها بیرون انداخته شدی. حالا با رمزِ جدید وارد شو.
                </p>
            </AuthFrame>
        );
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (password.length < 8) {
            setErr("رمز عبور باید حداقل ۸ کاراکتر باشد");
            return;
        }
        if (password !== confirm) {
            setErr("رمز عبور و تکرار آن یکسان نیستند");
            return;
        }
        setBusy(true);
        setErr(null);
        try {
            const r = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            const j = await r.json().catch(() => null);
            if (!r.ok) {
                setErr(j?.message ?? "تنظیمِ رمزِ جدید ناموفق بود");
                setBusy(false);
                return;
            }
            setDone(true);
            // Brief moment so the success card has a chance to land before we bounce.
            window.setTimeout(() => {
                router.replace("/login?reset=1");
            }, 1200);
        } catch {
            setErr("اتصال برقرار نشد");
            setBusy(false);
        }
    }

    return (
        <AuthFrame
            eyebrow="بازنشانیِ رمز"
            title="رمزِ جدید."
            epigraph="حداقل ۸ کاراکتر. یک رمزِ تازه و قوی بساز."
            footer={footer}
        >
            <form onSubmit={submit} className="space-y-4">
                <label className="block">
                    <span className="block text-xs font-bold text-bone-soft mb-1.5">رمزِ جدید</span>
                    <div className="relative">
                        <input
                            type={showPass ? "text" : "password"}
                            required
                            autoFocus
                            placeholder="حداقل ۸ کاراکتر"
                            className="t-input t-input-lg font-mono pe-10 text-start"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPass(!showPass)}
                            aria-label="نمایش رمز عبور"
                            aria-pressed={showPass}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-bone-dim hover:text-bone"
                        >
                            {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                </label>

                <label className="block">
                    <span className="block text-xs font-bold text-bone-soft mb-1.5">تکرارِ رمز</span>
                    <input
                        type={showPass ? "text" : "password"}
                        required
                        placeholder="همان رمزِ جدید"
                        className="t-input t-input-lg font-mono text-start"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
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
                    disabled={busy || !password || !confirm}
                    className="t-btn t-btn-primary t-btn-lg w-full"
                >
                    {busy ? (
                        <span className="inline-flex items-center gap-2">
                            <span className="typing-dot" />
                            <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                            <span className="typing-dot" style={{ animationDelay: "0.30s" }} />
                            در حالِ ثبت
                        </span>
                    ) : (
                        "ثبتِ رمزِ جدید"
                    )}
                </button>

                <p className="text-center text-xs text-bone-dim">
                    با ثبتِ رمزِ جدید، از تمامِ دستگاه‌های دیگر خارج می‌شوی.
                </p>
            </form>
        </AuthFrame>
    );
}
