import type { Metadata } from "next";
import { ScrollReveal } from "@/lib/motion";
import { ChatBubble } from "@/components/chat";
import { BreadcrumbLD, WebPageLD } from "@/components/schema-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

export const metadata: Metadata = {
    title: "حریمِ خصوصی",
    description:
        "سیاستِ حریمِ خصوصیِ TeleYab — چه چیزی نگه می‌داریم، با چه‌کسی به اشتراک می‌گذاریم، و چطور حسابت را حذف می‌کنی.",
    alternates: { canonical: "/privacy" },
};

const SECTIONS = [
    { title: "چه چیزی نگه می‌داریم؟", body: "ایمیلت، تاریخِ آخرین ورود، موجودیِ کیف‌پول، تراکنش‌ها و تاریخچهٔ جست‌و‌جوهایت. هر چیزی که برای صورت‌حساب و پشتیبانی لازم است — نه بیشتر." },
    { title: "جست‌و‌جوهایت کجا می‌روند؟", body: "هر کوئری در پایگاه دادهٔ داخلیِ TeleYab جست‌و‌جو می‌شود و نتیجه به همراهِ تاریخچه در حسابِ خودت ذخیره می‌گردد. این تاریخچه فقط برای تو قابلِ مشاهده است." },
    { title: "رمز عبور چطور ذخیره می‌شود؟", body: "رمز عبور با bcrypt هش می‌شود — هیچ‌وقت متنِ اصلی روی سرور ما ذخیره نمی‌شود. ایمیلت فقط یک‌بار هنگامِ ثبت‌نام برای تأیید استفاده می‌شود. پس از آن ورود فقط با ایمیل و رمز عبور است و نیازی به ایمیل مجدد نیست." },
    { title: "اشتراک‌گذاری با اشخاصِ ثالث", body: "داده‌های شما با هیچ‌کس به اشتراک گذاشته نمی‌شود مگر در پاسخ به الزامِ قانونیِ صریح." },
    { title: "حذفِ حساب", body: "با ارسالِ ایمیل می‌توانی درخواستِ حذف بدهی. تمامِ داده‌ها — به‌جز سوابقی که برای حسابداری الزامی است — حذف می‌شوند." },
];

export default function PrivacyPage() {
    return (
        <main className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-12 pb-20 lg:px-8 overflow-hidden">
            <BreadcrumbLD
                siteUrl={SITE_URL}
                items={[
                    { name: "خانه", url: SITE_URL + "/" },
                    { name: "حریم خصوصی", url: SITE_URL + "/privacy" },
                ]}
            />
            <WebPageLD
                siteUrl={SITE_URL}
                pageUrl={SITE_URL + "/privacy"}
                type="PrivacyPolicy"
                name="حریمِ خصوصی · TeleYab"
                description="سیاستِ حریمِ خصوصیِ TeleYab — چه چیزی نگه می‌داریم، با چه‌کسی به اشتراک می‌گذاریم، و چطور حسابت را حذف می‌کنی."
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-persimmon-soft blur-3xl blob-drift"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute top-1/2 -start-32 size-64 rounded-full bg-persimmon-soft/60 blur-3xl blob-drift"
                style={{ animationDelay: "3s" }}
            />

            <ScrollReveal as="header" className="relative mb-12">
                <span className="t-chip t-chip-brand mb-4">حریمِ خصوصی</span>
                <h1 className="display-fa text-4xl sm:text-5xl text-bone leading-tight">
                    حریمِ <span className="text-persimmon">خصوصی.</span>
                </h1>
                <p className="mt-3 text-sm text-bone-dim">سادگی، نه سندنویسی. آنچه باید بدانی، در پنج بند.</p>
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
                    سؤالی داری؟ همان ایمیلِ حساب را پاسخ می‌دهیم.
                </ChatBubble>
            </ScrollReveal>
        </main>
    );
}
