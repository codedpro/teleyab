import Link from "next/link";
import type { Metadata } from "next";
import { ScrollReveal } from "@/lib/motion";
import { ChatBubble } from "@/components/chat";
import { BreadcrumbLD, WebPageLD } from "@/components/schema-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

export const metadata: Metadata = {
    title: "قوانینِ استفاده",
    description:
        "قوانینِ استفاده از TeleYab — ماهیتِ سرویس، اصلِ «فقط برای نتیجه»، مسئولیتِ کاربر، کیف‌پول و بازپرداخت.",
    alternates: { canonical: "/terms" },
};

const SECTIONS = [
    {
        title: "ماهیتِ سرویس",
        body: "TeleYab یک سرویسِ جست‌و‌جوی شماره از روی یوزرنیمِ تلگرام است. ما پایگاه دادهٔ بزرگی از شماره‌های موبایلِ پیوسته به حساب‌های تلگرامی نگه می‌داریم. وقتی یک ‎@username‎ یا آی‌دیِ عددی بدهی، در دیتابیسِ خودمان جست‌و‌جو می‌کنیم و نتیجه را برمی‌گردانیم.",
    },
    {
        title: "اصلِ «فقط برای نتیجه»",
        body: "اگر یوزرنیم در دیتابیسِ ما پیدا نشود، چیزی از کیف پولت کسر نمی‌شود. هزینه فقط برای نتایجِ موفق دریافت می‌شود — این قاعدهٔ غیرقابلِ تغییرِ سرویس است.",
    },
    {
        title: "مسئولیتِ استفاده",
        body: "مسئولیتِ قانونی و اخلاقیِ هر جست‌و‌جو با کاربر است. استفاده برای آزار، کلاهبرداری، اخاذی، نقضِ حریمِ خصوصی یا جمع‌آوریِ گستردهٔ داده ممنوع است و حسابِ کاربر در صورتِ تشخیص بدون اطلاعِ قبلی مسدود می‌شود.",
    },
    {
        title: "کیف‌پول و بازپرداخت",
        body: "کیف‌پولِ شما در حسابِ TeleYab نگه داشته می‌شود. برای شارژ به صفحهٔ شارژِ کیف‌پول برو، مبلغ را مشخص کن و مشخصاتِ واریز را ثبت کن — پس از تأیید، موجودی به‌روز می‌شود. اگر بابتِ یک جست‌و‌جوی مشکوک هزینه‌ای کسر شده باشد می‌توانید درخواستِ بازپرداخت بدهید؛ پس از بررسی، مبلغ به کیف‌پول برمی‌گردد.",
    },
    {
        title: "سقف و محدودیت",
        body: "برای جلوگیری از سوءاستفاده، تعدادِ جست‌و‌جوهای موفقِ هر کاربر در هر ساعت محدود است. این سقف از تنظیماتِ سرویس قابلِ تغییر است.",
    },
    {
        title: "پشتیبانی و حذفِ حساب",
        body: "از طریقِ همان ایمیلی که برای ورود استفاده می‌کنید با ما در ارتباط باشید. برای حذفِ حساب درخواست ارسال کنید — به‌جز داده‌های الزامیِ حسابداری، مابقی حذف می‌شوند.",
    },
];

export default function TermsPage() {
    return (
        <main className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-12 pb-20 lg:px-8 overflow-hidden">
            <BreadcrumbLD
                siteUrl={SITE_URL}
                items={[
                    { name: "خانه", url: SITE_URL + "/" },
                    { name: "قوانین", url: SITE_URL + "/terms" },
                ]}
            />
            <WebPageLD
                siteUrl={SITE_URL}
                pageUrl={SITE_URL + "/terms"}
                type="TermsOfService"
                name="قوانینِ استفاده · TeleYab"
                description="قوانینِ استفاده از TeleYab — ماهیتِ سرویس، اصلِ «فقط برای نتیجه»، مسئولیتِ کاربر، کیف‌پول و بازپرداخت."
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-persimmon-soft blur-3xl blob-drift"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute top-2/3 -start-32 size-64 rounded-full bg-persimmon-soft/60 blur-3xl blob-drift"
                style={{ animationDelay: "4s" }}
            />

            <ScrollReveal as="header" className="relative mb-12">
                <span className="t-chip t-chip-brand mb-4">قوانینِ استفاده</span>
                <h1 className="display-fa text-4xl sm:text-5xl text-bone leading-tight">
                    قوانینِ <span className="text-persimmon">استفاده.</span>
                </h1>
                <p className="mt-3 text-sm text-bone-dim">
                    آخرین به‌روزرسانی: {new Intl.DateTimeFormat("fa-IR").format(new Date())}.
                </p>
            </ScrollReveal>

            <article className="prose-fa relative">
                {SECTIONS.map((s, i) => (
                    <ScrollReveal key={i} className="mb-8" y={20} delay={0.05}>
                        <h2>
                            <span className="text-persimmon font-mono me-2">{`۰${i + 1}.`}</span>
                            {s.title}
                        </h2>
                        <p>{s.body}</p>
                    </ScrollReveal>
                ))}
            </article>

            <ScrollReveal className="relative mt-16" y={16} delay={0.1}>
                <ChatBubble side="them" tone="neutral" timestamp="حالا">
                    با ادامهٔ استفاده از TeleYab، با این قوانین موافقت کرده‌ای.
                </ChatBubble>
            </ScrollReveal>

            <div className="relative mt-8 text-sm text-center">
                <Link href="/privacy" className="text-persimmon-deep underline underline-offset-2 hover:text-persimmon">
                    حریمِ خصوصی →
                </Link>
            </div>
        </main>
    );
}
