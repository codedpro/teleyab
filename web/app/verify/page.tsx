"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";

export default function VerifyPage() {
    return (
        <Suspense fallback={null}>
            <VerifyInner />
        </Suspense>
    );
}

function VerifyInner() {
    const params = useSearchParams();
    const token = params.get("token");
    const [state, setState] = useState<"verifying" | "ok" | "error">("verifying");
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setState("error");
            setMsg("لینک نامعتبر است");
            return;
        }
        fetch("/api/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        })
            .then(async (r) => {
                const j = await r.json().catch(() => ({}));
                if (!r.ok) {
                    setMsg(j?.message ?? "لینک نامعتبر یا منقضی است");
                    setState("error");
                    return;
                }
                setState("ok");
            })
            .catch(() => {
                setMsg("اتصال برقرار نشد");
                setState("error");
            });
    }, [token]);

    return (
        <AuthFrame
            eyebrow="تأییدِ ایمیل"
            title="یک لحظه…"
            footer={
                <Link href="/login" className="hover:text-persimmon">← بازگشت به ورود</Link>
            }
        >
            <style>{`
                @keyframes badge-pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes check-draw { from { stroke-dashoffset: 30; } to { stroke-dashoffset: 0; } }
            `}</style>
            {state === "verifying" ? (
                <>
                    <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 -m-3 rounded-full bg-persimmon/15 blur-2xl glow-pulse" />
                        <div className="relative size-14 rounded-full bg-persimmon-soft text-persimmon-deep flex items-center justify-center">
                            <svg className="animate-spin size-6" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-2xl font-extrabold text-bone">در حالِ تأیید…</h2>
                    <p className="mt-3 text-bone-soft text-sm leading-loose inline-flex items-center gap-1.5">
                        داریم لینک را بررسی می‌کنیم
                        <span className="inline-flex gap-1 ms-1 text-persimmon">
                            <span className="typing-dot" />
                            <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                            <span className="typing-dot" style={{ animationDelay: "0.30s" }} />
                        </span>
                    </p>
                </>
            ) : state === "ok" ? (
                <>
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
                    <h2 className="text-2xl font-extrabold text-bone">ایمیل تأیید شد!</h2>
                    <p className="mt-3 text-bone-soft text-sm leading-loose">
                        حسابت فعال شد. حالا می‌توانی با ایمیل و رمز عبورت وارد شوی.
                    </p>
                    <Link href="/login?verified=1" className="mt-6 t-btn t-btn-primary w-full">
                        ورود به حساب
                    </Link>
                </>
            ) : (
                <>
                    <div
                        className="size-14 rounded-full bg-rose/15 text-rose text-2xl flex items-center justify-center mb-4"
                        style={{ animation: "badge-pop 0.4s ease-out both" }}
                    >
                        ✕
                    </div>
                    <h2 className="text-2xl font-extrabold text-bone">لینک معتبر نیست.</h2>
                    <p className="mt-3 text-rose text-sm">{msg}</p>
                    <Link href="/login?tab=register" className="mt-6 t-btn t-btn-primary w-full">
                        ثبت‌نامِ مجدد
                    </Link>
                </>
            )}
        </AuthFrame>
    );
}
