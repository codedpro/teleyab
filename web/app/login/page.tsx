"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { Eye, EyeOff } from "lucide-react";
import { clearStoredNext, clearStoredRef, readStoredNext, readStoredRef, storeNext } from "@/components/ref-capture";
import { BreadcrumbLD } from "@/components/schema-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginInner />
        </Suspense>
    );
}

function LoginInner() {
    const params = useSearchParams();
    const router = useRouter();
    const urlRef = params.get("ref") || "";
    // Fallback chain: ?ref= in URL → previously-captured RefCapture localStorage
    // value → empty. Lazy state so the localStorage read runs on the client only.
    const [ref, setRef] = useState<string>(urlRef);
    useEffect(() => {
        if (!urlRef) {
            const stored = readStoredRef();
            if (stored) setRef(stored);
        }
    }, [urlRef]);
    const verified = params.get("verified") === "1";
    const passwordReset = params.get("reset") === "1";
    const defaultTab = params.get("tab") === "register" ? "register" : "login";
    // Bounce-back target after successful auth. Resolution order:
    //   1. ?next= in current URL (e.g. from the pricing-preset bounce)
    //   2. previously-stored next (set when register persisted it before the
    //      email-verify round-trip stripped it from the URL)
    //   3. default = /lookup
    // Only on-site paths (single leading slash) are honoured to prevent
    // open-redirect abuse.
    const rawNext = params.get("next") || "";
    const [resolvedNext, setResolvedNext] = useState<string>(
        rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/lookup",
    );
    useEffect(() => {
        if (rawNext) return;
        const stored = readStoredNext();
        if (stored) setResolvedNext(stored);
    }, [rawNext]);
    const nextTarget = resolvedNext;

    const [tab, setTab] = useState<"login" | "register">(defaultTab);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    function reset() {
        setErr(null);
        setDone(false);
    }

    async function submitLogin(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            const r = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const j = await r.json().catch(() => null);
            if (!r.ok) {
                setErr(j?.message ?? "ورود ناموفق بود");
                setBusy(false);
                return;
            }
            // Successful login — we're about to follow nextTarget, so drop
            // the stash that survived through email verification.
            clearStoredNext();
            router.replace(nextTarget);
        } catch {
            setErr("اتصال برقرار نشد");
            setBusy(false);
        }
    }

    async function submitRegister(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirm) {
            setErr("رمز عبور و تکرار آن یکسان نیستند");
            return;
        }
        if (password.length < 8) {
            setErr("رمز عبور باید حداقل ۸ کاراکتر باشد");
            return;
        }
        setBusy(true);
        setErr(null);
        try {
            const r = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password, ref_code: ref }),
            });
            const j = await r.json().catch(() => null);
            if (!r.ok) {
                setErr(j?.message ?? "ثبت‌نام ناموفق بود");
                setBusy(false);
                return;
            }
            // The server has stored the referral cookie; we no longer need the
            // localStorage fallback. Clear it so a future user on this device
            // doesn't inherit the previous ref code.
            clearStoredRef();
            // Persist the post-login destination across the email-verify
            // round-trip so the "ورود به حساب" button below and the verify
            // page can both restore it on /login?next=...
            if (nextTarget && nextTarget !== "/lookup") storeNext(nextTarget);
            setDone(true);
        } catch {
            setErr("اتصال برقرار نشد");
            setBusy(false);
        }
    }

    const footer = (
        <div className="flex items-center justify-between">
            <Link href="/" className="hover:text-persimmon">← خانه</Link>
            <Link href="/pricing" className="hover:text-persimmon">تعرفه</Link>
        </div>
    );

    if (done) {
        return (
            <AuthFrame
                eyebrow="ثبت‌نام"
                title="ایمیلت را چک کن"
                footer={footer}
            >
                <div className="relative mb-4 inline-block">
                    <div className="absolute inset-0 -m-3 rounded-full bg-jade/20 blur-2xl glow-pulse" />
                    <div className="relative size-14 rounded-full bg-jade/15 text-jade text-2xl flex items-center justify-center animate-[pop_0.5s_back.out]">
                        <style>{`@keyframes pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
                        ✓
                    </div>
                </div>
                <h2 className="text-2xl font-extrabold text-bone">لینک تأیید ارسال شد.</h2>
                <p className="mt-3 text-bone-soft text-sm leading-loose">
                    به{" "}
                    <span dir="ltr" className="font-mono text-bone">{email}</span>{" "}
                    سر بزن و روی لینک تأیید کلیک کن. بعد از تأیید می‌توانی وارد شوی.
                </p>
                <button
                    type="button"
                    onClick={() => { setDone(false); setTab("login"); reset(); }}
                    className="mt-6 t-btn t-btn-primary w-full"
                >
                    ورود به حساب
                </button>
            </AuthFrame>
        );
    }

    return (
        <AuthFrame
            eyebrow="حساب کاربری"
            title={tab === "login" ? "خوش آمدی." : "حساب بساز."}
            titleEn={tab === "login" ? "ورود به TeleYab" : "ثبت‌نام در TeleYab"}
            epigraph="یوزرنیمِ تلگرام را بده، شماره را بگیر."
            footer={footer}
        >
            <BreadcrumbLD
                siteUrl={SITE_URL}
                items={[
                    { name: "خانه", url: SITE_URL + "/" },
                    { name: "ورود", url: SITE_URL + "/login" },
                ]}
            />
            {verified && (
                <div className="mb-4 t-chip t-chip-success w-full justify-center">
                    ✓ ایمیل تأیید شد — حالا می‌توانی وارد شوی
                </div>
            )}
            {passwordReset && (
                <div className="mb-4 t-chip t-chip-success w-full justify-center">
                    ✓ رمزِ عبور تغییر کرد — حالا وارد شو
                </div>
            )}

            {/* Tab switcher */}
            <div className="flex rounded-xl border border-rule-soft overflow-hidden mb-6">
                <button
                    type="button"
                    onClick={() => { setTab("login"); reset(); }}
                    className={`flex-1 py-2.5 text-sm font-bold transition-colors ${tab === "login" ? "bg-persimmon text-white" : "text-bone-soft hover:text-bone"}`}
                >
                    ورود
                </button>
                <button
                    type="button"
                    onClick={() => { setTab("register"); reset(); }}
                    className={`flex-1 py-2.5 text-sm font-bold transition-colors ${tab === "register" ? "bg-persimmon text-white" : "text-bone-soft hover:text-bone"}`}
                >
                    ثبت‌نام
                </button>
            </div>

            {tab === "login" ? (
                <form onSubmit={submitLogin} className="space-y-4">
                    {ref ? (
                        <div className="t-chip t-chip-brand w-full justify-center">
                            با کدِ دعوت <span dir="ltr" className="font-mono mx-1">{ref}</span>
                        </div>
                    ) : null}

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

                    <label className="block">
                        <span className="block text-xs font-bold text-bone-soft mb-1.5">رمز عبور</span>
                        <div className="relative">
                            <input
                                type={showPass ? "text" : "password"}
                                required
                                placeholder="••••••••"
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
                        <div className="mt-1.5 text-end">
                            <Link href="/forgot-password" className="text-xs text-bone-dim hover:text-persimmon">
                                رمز را فراموش کرده‌ای؟
                            </Link>
                        </div>
                    </label>

                    {err ? (
                        <p className="text-rose text-sm flex items-center gap-1.5 animate-[wiggle_0.3s_ease-in-out]">
                            <style>{`@keyframes wiggle { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }`}</style>
                            <span className="size-1.5 rounded-full bg-rose" /> {err}
                        </p>
                    ) : null}

                    <button
                        type="submit"
                        disabled={busy || !email || !password}
                        className="t-btn t-btn-primary t-btn-lg w-full"
                    >
                        {busy ? (
                            <span className="inline-flex items-center gap-2">
                                <span className="typing-dot" />
                                <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                                <span className="typing-dot" style={{ animationDelay: "0.30s" }} />
                                در حالِ ورود
                            </span>
                        ) : (
                            "ورود"
                        )}
                    </button>

                    <p className="text-center text-xs text-bone-dim">
                        حساب نداری؟{" "}
                        <button type="button" onClick={() => { setTab("register"); reset(); }} className="text-persimmon hover:underline">
                            ثبت‌نام کن
                        </button>
                    </p>
                </form>
            ) : (
                <form onSubmit={submitRegister} className="space-y-4">
                    {ref ? (
                        <div className="t-chip t-chip-brand w-full justify-center">
                            با کدِ دعوت <span dir="ltr" className="font-mono mx-1">{ref}</span>
                        </div>
                    ) : null}

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

                    <label className="block">
                        <span className="block text-xs font-bold text-bone-soft mb-1.5">رمز عبور</span>
                        <div className="relative">
                            <input
                                type={showPass ? "text" : "password"}
                                required
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
                        <span className="block text-xs font-bold text-bone-soft mb-1.5">تکرار رمز عبور</span>
                        <input
                            type={showPass ? "text" : "password"}
                            required
                            placeholder="همان رمز عبور"
                            className="t-input t-input-lg font-mono text-start"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                        />
                    </label>

                    {err ? (
                        <p className="text-rose text-sm flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-rose" /> {err}
                        </p>
                    ) : null}

                    <button
                        type="submit"
                        disabled={busy || !email || !password || !confirm}
                        className="t-btn t-btn-primary t-btn-lg w-full"
                    >
                        {busy ? (
                            <span className="inline-flex items-center gap-2">
                                <span className="typing-dot" />
                                <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                                <span className="typing-dot" style={{ animationDelay: "0.30s" }} />
                                در حالِ ثبت‌نام
                            </span>
                        ) : (
                            "ثبت‌نام"
                        )}
                    </button>

                    <p className="text-center text-xs text-bone-dim">
                        قبلاً ثبت‌نام کردی؟{" "}
                        <button type="button" onClick={() => { setTab("login"); reset(); }} className="text-persimmon hover:underline">
                            وارد شو
                        </button>
                    </p>
                </form>
            )}

            <p className="mt-8 border-t border-rule-soft pt-5 text-xs text-bone-dim leading-loose">
                با ادامه، با{" "}
                <Link href="/terms" className="text-persimmon-deep underline underline-offset-2">قوانینِ استفاده</Link>
                {" "}و{" "}
                <Link href="/privacy" className="text-persimmon-deep underline underline-offset-2">حریمِ خصوصی</Link>
                {" "}موافقت می‌کنی.
            </p>
        </AuthFrame>
    );
}
