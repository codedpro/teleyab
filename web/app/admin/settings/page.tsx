"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollReveal, StaggerChildren } from "@/lib/motion";

const FIELDS: { key: string; label: string; desc: string; type: "number" | "text" | "bool" }[] = [
    { key: "price_per_lookup_toman", label: "PRICE PER LOOKUP", desc: "تومان · هر نتیجهٔ موفق این رقم کسر می‌شود.", type: "number" },
    { key: "min_topup_toman", label: "MIN TOP-UP", desc: "تومان · کمترین مبلغ مجاز.", type: "number" },
    { key: "max_topup_toman", label: "MAX TOP-UP", desc: "تومان · بیشترین مبلغ مجاز.", type: "number" },
    { key: "lookup_cache_days", label: "CACHE · DAYS", desc: "۰ = غیرفعال. پنجرهٔ سرویس از کش.", type: "number" },
    { key: "low_balance_threshold", label: "UPSTREAM ALERT", desc: "زیر این عدد ایمیلِ هشدار می‌رود.", type: "number" },
    { key: "operator_alert_email", label: "OPERATOR EMAIL", desc: "هشدارها به این آدرس می‌رود.", type: "text" },
    { key: "per_user_hourly_quota", label: "USER · HOURLY", desc: "تعدادِ جست‌و‌جوی موفق در هر ساعت.", type: "number" },
    { key: "per_ip_minute_quota", label: "IP · MINUTE", desc: "rate-limit پیشگیرانه برای هر IP.", type: "number" },
    { key: "abuse_min_lookups_to_flag", label: "ABUSE · MIN LOOKUPS", desc: "زیر این عدد فلگ نمی‌کنیم.", type: "number" },
    { key: "abuse_max_success_ratio", label: "ABUSE · RATIO MAX", desc: "زیر این نسبت → فلگِ احتمالی scraper.", type: "number" },
    { key: "referral_bonus_toman", label: "REFERRAL BONUS", desc: "تومان · به هر طرف هنگام موفقیتِ اول.", type: "number" },
    { key: "bulk_import_max_rows", label: "BULK · MAX ROWS", desc: "حداکثر آیتم در هر batch.", type: "number" },
    { key: "public_api_enabled", label: "PUBLIC API", desc: "اگر false، endpoint /v1 پاسخ نمی‌دهد.", type: "bool" },
    { key: "bank_card_number", label: "CARD · NUMBER", desc: "شماره کارتِ واریز برای شارژِ کارت به کارت (نمایش داده می‌شود به کاربر).", type: "text" },
    { key: "bank_card_holder", label: "CARD · HOLDER", desc: "نامِ صاحبِ کارت.", type: "text" },
    { key: "bank_name", label: "BANK · NAME", desc: "نامِ بانک (مثلاً: ملت، ملی، صادرات).", type: "text" },
];

export default function AdminSettings() {
    const [settings, setSettings] = useState<Record<string, string> | null>(null);
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch("/api/admin/settings", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { setSettings(j || {}); setDraft(j || {}); });
    }, []);

    async function save() {
        setSaving(true);
        const r = await fetch("/api/admin/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
        });
        if (r.ok) {
            setSettings(draft);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
        }
        setSaving(false);
    }

    if (!settings) {
        return (
            <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10 lg:px-12">
                <div className="t-card t-card-pad text-center text-bone-dim">…</div>
            </main>
        );
    }

    const dirty = JSON.stringify(settings) !== JSON.stringify(draft);

    return (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="pt-6">
                <Link href="/admin" className="text-bone-soft hover:text-persimmon text-sm">← داشبورد</Link>
            </div>

            <ScrollReveal className="py-8" y={16}>
                <div className="flex items-end justify-between flex-wrap gap-4">
                    <div>
                        <span className="t-chip t-chip-brand mb-3 inline-flex">
                            <span className="dot-live" />
                            RUNTIME · SETTINGS
                        </span>
                        <h1 className="display-fa mt-3 text-bone text-3xl md:text-5xl">تنظیمات.</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {saved ? <span className="t-chip t-chip-success">ذخیره شد ✓</span> : null}
                        <button
                            onClick={save}
                            disabled={!dirty || saving}
                            className="t-btn t-btn-primary"
                        >
                            {saving ? "ذخیره…" : "ذخیرهٔ تغییرات"}
                        </button>
                    </div>
                </div>
            </ScrollReveal>

            <StaggerChildren className="grid gap-3 pb-12" stagger={0.04}>
                {FIELDS.map((f, i) => (
                    <div key={f.key} className="t-card t-card-pad-lg">
                        <div className="grid grid-cols-12 gap-x-6 gap-y-3">
                            <div className="col-span-12 md:col-span-5">
                                <div className="flex items-baseline gap-3">
                                    <span className="font-mono text-[10px] text-bone-dim">{String(i + 1).padStart(2, "0")}</span>
                                    <span className="t-chip t-chip-brand">{f.label}</span>
                                </div>
                                <div className="mt-2 ltr font-mono text-xs text-bone-dim" dir="ltr">{f.key}</div>
                                <p className="mt-2 text-sm text-bone-soft leading-loose">{f.desc}</p>
                            </div>
                            <div className="col-span-12 md:col-span-7 flex items-center">
                                {f.type === "bool" ? (
                                    <label className="inline-flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(draft[f.key] ?? "true").toLowerCase() === "true"}
                                            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.checked ? "true" : "false" })}
                                            className="h-5 w-5 accent-persimmon"
                                        />
                                        <span className={(draft[f.key] ?? "true").toLowerCase() === "true" ? "t-chip t-chip-success" : "t-chip t-chip-muted"}>
                                            {(draft[f.key] ?? "true").toLowerCase() === "true" ? "ENABLED" : "DISABLED"}
                                        </span>
                                    </label>
                                ) : (
                                    <input
                                        dir="ltr"
                                        type={f.type === "number" ? "number" : "text"}
                                        className="t-input t-input-lg ltr font-mono w-full"
                                        value={draft[f.key] ?? ""}
                                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </StaggerChildren>
        </main>
    );
}
