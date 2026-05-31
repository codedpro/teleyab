import Link from "next/link";
import type { Metadata } from "next";
import {
    ArrowLeft,
    Check,
    Search,
    Send,
    Wallet,
    Zap,
    Code2,
    ShieldCheck,
    Sparkles,
    Database,
    Quote,
} from "lucide-react";
import {
    BreadcrumbLD,
    FAQLD,
    HowToLD,
    ServiceLD,
    SiteNavigationLD,
    SoftwareApplicationLD,
} from "@/components/schema-ld";
import { LiveChatDemo, ChatStream, ChatBubble, TypingDots } from "@/components/chat";
import { ScrollReveal, StaggerChildren, CountUp, MagneticHover } from "@/lib/motion";
import { FAQ } from "@/lib/faq";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

const TITLE = "TeleYab — یوزرنیمِ تلگرام به شماره · نرخ موفقیت ۸۰٪ · فقط برای نتیجه پرداخت کن";
const DESCRIPTION =
    "‫@username یا آی‌دی عددیِ تلگرام را بده، شمارهٔ موبایل پشتِ آن را برمی‌گردانیم. بزرگ‌ترین دیتابیسِ خصوصیِ تلگرامی. نرخِ موفقیتِ ۸۰–۸۵٪. فقط برای نتیجهٔ موفق پرداخت می‌کنی.";

export const metadata: Metadata = {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: "/" },
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        url: "/",
        siteName: "TeleYab",
        type: "website",
        locale: "fa_IR",
    },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const HOW_TO_STEPS = [
    { name: "یوزرنیم بفرست", text: "‫@username تلگرامی یا آی‌دیِ عددی را در فرمِ جست‌و‌جو وارد کن." },
    { name: "ما جست‌و‌جو می‌کنیم", text: "در پایگاه دادهٔ خصوصیِ TeleYab نتیجه را از منابعِ متعدد بررسی می‌کنیم." },
    { name: "شماره و جزئیات را بگیر", text: "شماره، نام، ایمیل، تاریخ تولد و موقعیت در همان صفحه نمایش داده می‌شود. اگر پیدا نشد، چیزی پرداخت نمی‌کنی." },
];

const LIVE_TICKER = [
    { q: "@aliosint", ok: true },
    { q: "@maral_design", ok: true },
    { q: "@sk_dev", ok: false },
    { q: "@notion_hq", ok: true },
    { q: "@erfan_99", ok: true },
    { q: "@ghosted_account", ok: false },
    { q: "@telegramfa", ok: true },
    { q: "@samanos", ok: true },
];

// Fallback used only inside JSON-LD when the live admin-set price is not
// available at build time. Never surfaced in user-facing copy.
const SCHEMA_PRICE_FALLBACK = 800000;

export default function Home() {
    return (
        <>
            <FAQLD items={FAQ} />
            <HowToLD
                siteUrl={SITE_URL}
                name="چطور با TeleYab شمارهٔ پشتِ یک یوزرنیمِ تلگرام را پیدا کنیم"
                description="سه قدم برای رسیدن از یک یوزرنیمِ تلگرامی به شمارهٔ موبایلِ پشتِ آن."
                steps={HOW_TO_STEPS}
            />
            <ServiceLD siteUrl={SITE_URL} priceToman={SCHEMA_PRICE_FALLBACK} />
            <SoftwareApplicationLD siteUrl={SITE_URL} priceToman={SCHEMA_PRICE_FALLBACK} />
            <SiteNavigationLD siteUrl={SITE_URL} />
            <BreadcrumbLD
                siteUrl={SITE_URL}
                items={[{ name: "خانه", url: SITE_URL + "/" }]}
            />

            {/* ───────── Hero ───────── */}
            <section role="region" aria-label="معرفی" className="relative overflow-hidden">
                <Backdrop />
                <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-20 pb-20 lg:px-8">
                    <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center">
                        {/* Left: pitch */}
                        <div className="reveal reveal-1">
                            <span className="t-chip t-chip-brand mb-5">
                                <span className="dot-live" />
                                مخصوصِ تلگرام
                            </span>
                            <h1 className="display-fa text-5xl sm:text-6xl lg:text-7xl text-bone leading-[1.05]">
                                یوزرنیمِ تلگرام را بده،
                                <br />
                                <span className="text-persimmon relative inline-block">
                                    شماره را بگیر.
                                    <Underline />
                                </span>
                            </h1>
                            <p className="mt-6 text-lg text-bone-soft leading-loose max-w-xl">
                                دیتابیسِ خصوصیِ ما را روی تلگرام ساخته‌ایم. علاوه بر شماره، نام، ایمیل، تاریخ تولد و موقعیت را هم برمی‌گردانیم.{" "}
                                <span className="text-bone font-bold">نرخِ موفقیتِ ۸۰ تا ۸۵٪. اگر چیزی پیدا نشد، هیچ هزینه‌ای نداری.</span>
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <MagneticHover>
                                    <Link href="/login" className="t-btn t-btn-primary t-btn-lg">
                                        شروع رایگان
                                        <ArrowLeft className="size-4" />
                                    </Link>
                                </MagneticHover>
                                <Link href="/pricing" className="t-btn t-btn-ghost t-btn-lg">
                                    مشاهدهٔ تعرفه
                                </Link>
                            </div>

                            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-bone-soft">
                                <Trust>بدون اشتراکِ ماهانه</Trust>
                                <Trust>فقط بابتِ نتیجهٔ موفق</Trust>
                                <Trust>ورود با ایمیل</Trust>
                            </div>

                            {/* Floating sticker row */}
                            <div className="mt-8 flex flex-wrap items-center gap-2">
                                <span className="t-sticker float-y">
                                    <Sparkles className="size-3 text-saffron" /> دیتابیس خصوصی
                                </span>
                                <span className="t-sticker float-y delay-1">
                                    <Database className="size-3 text-persimmon" /> چندمنبعی
                                </span>
                                <span className="t-sticker float-y delay-2">
                                    <ShieldCheck className="size-3 text-jade" /> تومانی · امن
                                </span>
                            </div>
                        </div>

                        {/* Right: live looping chat demo */}
                        <div className="relative reveal reveal-2">
                            <div className="absolute -inset-8 -z-10 rounded-[40px] bg-persimmon/15 blur-3xl glow-pulse" />
                            <LiveChatDemo />
                        </div>
                    </div>
                </div>
            </section>

            {/* ───────── Stats strip ───────── */}
            <section role="region" aria-label="آمارِ کلیدی" className="relative">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-6 lg:px-8">
                    <ScrollReveal className="t-card overflow-hidden">
                        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-rule-soft rtl:divide-x-reverse">
                            <StatCell value={85} suffix="٪" label="نرخ موفقیت" />
                            <StatCell value={2} suffix="s" label="میانگین پاسخ" />
                            <StatCell value={500} suffix="+" label="ردیف در batch" />
                            <StatCell value={0} suffix=" تومان" label="هزینهٔ جست‌و‌جوی ناموفق" />
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* ───────── How it works — chat thread ───────── */}
            <section role="region" aria-label="چطور کار می‌کند" className="relative">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 lg:px-8">
                    <SectionHead kicker="چطور کار می‌کند" title="فقط سه قدم تا شماره." />
                    <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_1fr] items-start">
                        <StaggerChildren className="space-y-4">
                            <StepCard n="۱" icon={<Send className="size-5" />} title="یوزرنیم بفرست" body="‫@username تلگرامی یا آی‌دیِ عددی. کوتاه و ساده." />
                            <StepCard n="۲" icon={<Search className="size-5" />} title="ما جست‌و‌جو می‌کنیم" body="در بزرگ‌ترین دیتابیسِ خصوصیِ تلگرامی، نتیجه را از منابعِ متعدد بررسی می‌کنیم." />
                            <StepCard n="۳" icon={<Check className="size-5" />} title="شماره و جزئیات را بگیر" body="شماره، نام، ایمیل، تاریخ تولد و موقعیت. اگر پیدا نشد؟ صفر تومان." />
                        </StaggerChildren>

                        {/* Side-by-side chat that demonstrates step-by-step */}
                        <div className="t-card overflow-hidden">
                            <div className="px-5 py-3 border-b border-rule-soft bg-persimmon-soft/40 flex items-center gap-3">
                                <div className="size-8 rounded-full bg-persimmon text-white grid place-items-center font-extrabold text-sm">T</div>
                                <div className="text-sm font-bold text-bone">نمونهٔ گفت‌و‌گو</div>
                            </div>
                            <div className="bg-tg-paper px-5 py-5">
                                <ChatStream interval={0.45}>
                                    <ChatBubble side="me" tone="brand" ticks="read" timestamp="۲۰:۱۲">
                                        <span dir="ltr" className="font-mono">@arman_dev</span>
                                    </ChatBubble>
                                    <TypingDots />
                                    <ChatBubble
                                        side="them"
                                        timestamp="۲۰:۱۲"
                                        meta={
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="size-1.5 rounded-full bg-jade" /> یافت شد
                                            </span>
                                        }
                                    >
                                        <div className="space-y-1.5">
                                            <div dir="ltr" className="font-mono font-extrabold text-persimmon-deep text-base">
                                                +98 912 *** 4521
                                            </div>
                                            <div className="text-[12px] text-bone">
                                                <span className="text-bone-dim">نام:</span> آرمان دهقانی
                                            </div>
                                            <div dir="ltr" className="text-[12px] font-mono text-bone">
                                                <span className="text-bone-dim">email:</span> arman.d***@gmail.com
                                            </div>
                                            <div className="text-[11px] text-bone-soft">
                                                <span className="text-bone-dim">یوزرنیم‌های قبلی:</span>{" "}
                                                <span dir="ltr" className="font-mono">@arman_98, @armandev</span>
                                            </div>
                                            <div className="text-[11px] text-bone-soft">
                                                <span className="text-bone-dim">تولد:</span> ۱۳۷۲/۰۴/۱۸
                                            </div>
                                        </div>
                                    </ChatBubble>
                                    <ChatBubble side="me" tone="brand" ticks="read" timestamp="۲۰:۱۳">
                                        <span dir="ltr" className="font-mono">@notarealhandle_999</span>
                                    </ChatBubble>
                                    <ChatBubble side="them" tone="muted" timestamp="۲۰:۱۳">
                                        یافت نشد · ۰ تومان · رایگان
                                    </ChatBubble>
                                </ChatStream>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ───────── Features grid ───────── */}
            <section role="region" aria-label="ویژگی‌ها" className="relative">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 lg:px-8">
                    <SectionHead kicker="چه چیزی همراهت است" title="یک ابزار، خلاصه و کاربردی." />
                    <StaggerChildren stagger={0.07} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Feature icon={<Zap className="size-5" />} title="نرخِ موفقیتِ ۸۰–۸۵٪" body="بزرگ‌ترین دیتابیسِ خصوصیِ تلگرامی. حساب‌های قدیمی‌تر شانسِ بالاتری دارند." />
                        <Feature icon={<Search className="size-5" />} title="فراتر از شماره" body="نام، ایمیل، تاریخ تولد و موقعیتِ جغرافیایی را از منابعِ متعدد بررسی می‌کنیم." />
                        <Feature icon={<ShieldCheck className="size-5" />} title="پیدا نشد؟ پولی کسر نمی‌شود" body="اگر یوزرنیم در دیتابیس‌مان نباشد، چیزی از کیف پولت برداشته نمی‌شود — همیشه همین." />
                        <Feature icon={<Wallet className="size-5" />} title="کیف پولِ تومانی" body="یک‌بار شارژ کن، هر زمان جست‌و‌جو کن. تاریخچهٔ شفاف هر تراکنش." />
                        <Feature icon={<Code2 className="size-5" />} title="کلیدِ Bearer برای کد" body="نمونهٔ curl ظرف ۳۰ ثانیه. سازگار با هر کلاینتِ HTTP." />
                        <Feature icon={<Send className="size-5" />} title="جست‌و‌جوی دسته‌ای" body="تا ۵۰۰ ردیف در یک batch. هزینهٔ هر ردیف مثلِ تکی، شکست رایگان." />
                    </StaggerChildren>
                </div>
            </section>

            {/* ───────── Use cases / personas ───────── */}
            <section role="region" aria-label="کاربردها" className="relative pt-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <SectionHead kicker="برای چه کسی" title="کجاها به‌کار می‌آید." />
                    <StaggerChildren stagger={0.08} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <UseCase
                            tag="OSINT"
                            title="تحقیقاتِ متن‌باز"
                            body="برای محقق‌هایی که از یک یوزرنیمِ تلگرام شروع می‌کنند و باید به یک هویتِ واقعی برسند. علاوه بر شماره، نام و یوزرنیم‌های قبلی هم برمی‌گردد."
                        />
                        <UseCase
                            tag="املاک · بازاریابی"
                            title="کشفِ شمارهٔ مشتری"
                            body="آگهی‌های تلگرامی همیشه فقط @username می‌گذارند. شماره را بگیر، مستقیم تماس بگیر یا پیامک بفرست — بدون انتظارِ پاسخ در DM."
                        />
                        <UseCase
                            tag="استخدام"
                            title="بررسیِ کاندیدا"
                            body="یوزرنیمِ کاندیدا را وارد کن، سوابقش را با یوزرنیم‌های قبلی مقایسه کن، و در صورتِ نیاز با شمارهٔ واقعی تماس بگیر."
                        />
                        <UseCase
                            tag="روزنامه‌نگاری"
                            title="تأییدِ منبع"
                            body="یوزرنیم در دسترس است اما هویت مبهم؟ TeleYab به نام، تاریخ تولد و یوزرنیم‌های قدیمی دسترسی می‌دهد تا بتوانی منبع را راست‌آزمایی کنی."
                        />
                        <UseCase
                            tag="کسبِ‌و‌کار"
                            title="پیگیریِ بدهکار"
                            body="مشتری بعد از خرید فقط در تلگرام پاسخ می‌دهد و بعد ناپدید می‌شود؟ شماره را بگیر، پیگیری را به دنیای واقعی ببر."
                        />
                        <UseCase
                            tag="توسعه‌دهنده"
                            title="غنی‌سازیِ دیتابیس"
                            body="کلیدِ Bearer بساز، API ما را به CRM یا داشبوردِ خودت وصل کن، و در پشتِ سن، یوزرنیم‌های تلگرامیِ کاربرانت را به شماره تبدیل کن."
                        />
                    </StaggerChildren>
                </div>
            </section>

            {/* ───────── Live searches marquee ───────── */}
            <section role="region" aria-label="جست‌و‌جوهای زنده" className="relative pt-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <SectionHead kicker="همین حالا" title="جست‌و‌جوهایی که کاربرها انجام می‌دهند." />
                    <div className="marquee-mask mt-10 overflow-hidden">
                        <div className="marquee">
                            {[...LIVE_TICKER, ...LIVE_TICKER].map((t, i) => (
                                <span
                                    key={i}
                                    className="t-card lift px-4 py-2 inline-flex items-center gap-2 text-sm whitespace-nowrap"
                                >
                                    <span className="dot-live" />
                                    <span dir="ltr" className="font-mono text-persimmon-deep">
                                        {t.q}
                                    </span>
                                    <span className="text-bone-dim">→</span>
                                    <span className={`text-xs font-bold ${t.ok ? "text-jade" : "text-bone-dim"}`}>
                                        {t.ok ? "یافت شد" : "یافت نشد"}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ───────── Developer surface ───────── */}
            <section role="region" aria-label="API برای توسعه‌دهنده" className="relative pt-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] items-center">
                        <ScrollReveal>
                            <span className="t-chip t-chip-brand mb-4">برای توسعه‌دهنده</span>
                            <h2 className="display-fa text-3xl sm:text-4xl text-bone leading-tight">
                                با یک خط curl،{" "}
                                <span className="text-persimmon">شماره را برمی‌گردانیم.</span>
                            </h2>
                            <p className="mt-4 text-bone-soft leading-loose max-w-md">
                                کلیدِ Bearer می‌سازی، endpoint را صدا می‌زنی، نتیجهٔ JSON می‌گیری. صورت‌حساب همان کیف پولِ تومانی است — نه quotaی سختگیرانه، نه callbackی پیچیده.
                            </p>
                            <div className="mt-6 flex gap-3">
                                <Link href="/keys" className="t-btn t-btn-primary">ساختِ کلید</Link>
                                <Link href="/lookup" className="t-btn t-btn-ghost">جست‌و‌جوی دستی</Link>
                            </div>
                        </ScrollReveal>
                        <ScrollReveal>
                            <CodeBlock />
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* ───────── Testimonials ───────── */}
            <section role="region" aria-label="نظرِ کاربران" className="relative pt-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <SectionHead kicker="کاربران چه می‌گویند" title="کار را راه می‌اندازد." />
                    <StaggerChildren stagger={0.1} className="mt-10 grid gap-4 md:grid-cols-3">
                        <Testimonial
                            quote="دو تا یوزرنیمِ خیلی قدیمی داشتم که هیچ‌جا پیدا نمی‌کردم. همین‌جا، پنج دقیقه‌ای، هر دو شماره را گرفتم."
                            name="رضا · فعالِ OSINT"
                        />
                        <Testimonial
                            quote="کیف پولِ تومانی و یک API ساده. همان روز integration را روی پروژه‌ام بستم."
                            name="نیکا · توسعه‌دهنده"
                        />
                        <Testimonial
                            quote="روی یوزرنیم‌های قدیمی، تقریباً همیشه جواب می‌گیرم. خیلی بهتر از چیزی که قبلاً امتحان کرده بودم."
                            name="حسام · تحقیقاتِ بازار"
                        />
                    </StaggerChildren>
                </div>
            </section>

            {/* ───────── Closing CTA ───────── */}
            <section role="region" aria-label="فراخوانِ نهایی" className="relative">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-24 lg:px-8">
                    <ScrollReveal className="t-card overflow-hidden relative">
                        <div className="absolute inset-0 -z-0 opacity-70 pointer-events-none">
                            <div className="absolute -top-24 -end-24 size-72 rounded-full bg-persimmon-soft blur-3xl blob-drift" />
                            <div
                                className="absolute -bottom-24 -start-24 size-72 rounded-full bg-jade/10 blur-3xl blob-drift"
                                style={{ animationDelay: "3s" }}
                            />
                        </div>
                        <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-16 grid gap-8 md:grid-cols-[1.4fr_1fr] items-center">
                            <div>
                                <h2 className="display-fa text-3xl sm:text-4xl text-bone leading-tight">
                                    اگر یوزرنیم در دیتابیسِ ما باشد،
                                    <br />
                                    <span className="text-persimmon">پیدا می‌شود.</span>
                                </h2>
                                <p className="mt-4 text-bone-soft leading-loose">
                                    اگر نبود، چیزی هم پرداخت نمی‌کنی.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                                <MagneticHover>
                                    <Link href="/login" className="t-btn t-btn-primary t-btn-lg">
                                        حساب بساز
                                        <ArrowLeft className="size-4" />
                                    </Link>
                                </MagneticHover>
                                <Link href="/pricing" className="t-btn t-btn-ghost t-btn-lg">
                                    تعرفهٔ زنده
                                </Link>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* ───────── FAQ ───────── */}
            <section role="region" aria-label="پرسش‌های پرتکرار" className="relative">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-24 lg:px-8">
                    <SectionHead kicker="پرسش‌های پرتکرار" title="آنچه پیش از ثبت‌نام می‌پرسند." />
                    <ScrollReveal className="mt-8 t-card divide-y divide-rule-soft">
                        {FAQ.map((f, i) => (
                            <details key={i} className="group p-5 sm:p-6 [&_summary::-webkit-details-marker]:hidden">
                                <summary className="cursor-pointer flex items-center justify-between gap-4 font-bold text-bone text-base">
                                    <span>{f.q}</span>
                                    <span className="text-persimmon shrink-0 transition-transform group-open:rotate-45 text-xl leading-none">
                                        +
                                    </span>
                                </summary>
                                <p className="mt-3 text-bone-soft leading-loose text-sm sm:text-base">
                                    {f.a}
                                </p>
                            </details>
                        ))}
                    </ScrollReveal>
                </div>
            </section>
        </>
    );
}

/* ─── inline subcomponents ─── */

function Backdrop() {
    return (
        <div className="absolute inset-0 -z-0 overflow-hidden pointer-events-none" aria-hidden>
            <div className="absolute -top-32 -end-24 size-[480px] rounded-full bg-persimmon-soft blur-3xl blob-drift" />
            <div
                className="absolute -bottom-40 -start-24 size-[420px] rounded-full bg-saffron/15 blur-3xl blob-drift"
                style={{ animationDelay: "2.5s" }}
            />
        </div>
    );
}

function Underline() {
    return (
        <svg
            aria-hidden
            className="absolute -bottom-3 inset-x-0 w-full"
            height="14"
            viewBox="0 0 240 14"
            preserveAspectRatio="none"
        >
            <path
                d="M2 9 Q60 -2 120 6 T238 5"
                fill="none"
                stroke="var(--color-persimmon)"
                strokeWidth="3"
                strokeLinecap="round"
                style={{
                    strokeDasharray: 260,
                    strokeDashoffset: 260,
                    animation: "underline-draw 1.1s ease-out 0.4s forwards",
                }}
            />
            <style>{`@keyframes underline-draw { to { stroke-dashoffset: 0; } }`}</style>
        </svg>
    );
}

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
    return (
        <ScrollReveal className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-bold tracking-wider text-persimmon uppercase mb-3">
                {kicker}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-bone tracking-tight">{title}</h2>
        </ScrollReveal>
    );
}

function Trust({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <Check className="size-4 text-jade" />
            <span>{children}</span>
        </span>
    );
}

function StepCard({ n, icon, title, body }: { n: string; icon: React.ReactNode; title: string; body: string }) {
    return (
        <div className="t-card t-card-pad lift relative">
            <div className="absolute top-4 end-4 text-5xl font-extrabold text-persimmon-soft leading-none select-none">
                {n}
            </div>
            <div className="size-10 rounded-full bg-persimmon-soft text-persimmon-deep flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="font-extrabold text-lg text-bone mb-2">{title}</h3>
            <p className="text-sm text-bone-soft leading-loose">{body}</p>
        </div>
    );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
    return (
        <div className="t-card t-card-pad lift">
            <div className="size-10 rounded-full bg-persimmon-soft text-persimmon-deep flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="font-bold text-base text-bone mb-2">{title}</h3>
            <p className="text-sm text-bone-soft leading-loose">{body}</p>
        </div>
    );
}

function StatCell({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
    return (
        <div className="px-4 py-6 sm:py-7 text-center">
            <div className="text-3xl sm:text-4xl font-extrabold text-persimmon">
                <CountUp to={value} suffix={suffix} />
            </div>
            <div className="mt-2 text-xs sm:text-sm text-bone-soft">{label}</div>
        </div>
    );
}

function UseCase({ tag, title, body }: { tag: string; title: string; body: string }) {
    return (
        <article className="t-card t-card-pad lift h-full flex flex-col">
            <span className="inline-flex self-start text-[10px] font-bold tracking-wider text-persimmon-deep bg-persimmon-soft px-2 py-0.5 rounded-full mb-3">
                {tag}
            </span>
            <h3 className="font-extrabold text-base text-bone mb-2">{title}</h3>
            <p className="text-sm text-bone-soft leading-loose">{body}</p>
        </article>
    );
}

function Testimonial({ quote, name }: { quote: string; name: string }) {
    return (
        <div className="t-card t-card-pad lift relative">
            <Quote className="absolute top-4 end-4 size-6 text-persimmon-soft" />
            <p className="text-sm sm:text-base text-bone leading-relaxed">{quote}</p>
            <div className="mt-4 text-xs text-bone-dim">— {name}</div>
        </div>
    );
}

function CodeBlock() {
    return (
        <div className="t-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-rule-soft bg-night-700">
                <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-rose/60" />
                    <span className="size-2.5 rounded-full bg-saffron/80" />
                    <span className="size-2.5 rounded-full bg-jade/80" />
                </div>
                <div className="text-[11px] text-bone-dim ms-2 font-mono">curl — teleyab</div>
            </div>
            <pre
                dir="ltr"
                className="font-mono text-[12.5px] sm:text-[13px] leading-7 text-bone p-5 overflow-x-auto bg-white"
            >
{`curl -X POST https://teleyab.ir/api/v1/lookup \\
  -H "Authorization: Bearer $TELEYAB_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "query": "@durov" }'

# → { "success": true,
#     "numbers": ["+989124528521"],
#     "country": "IR",
#     "cost_toman": 800000,
#     "balance_toman": 49200000 }`}
            </pre>
        </div>
    );
}
