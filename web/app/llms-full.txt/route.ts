// llms-full.txt — long-form, factual dump for AI crawlers.
// Includes full FAQ, HowTo, privacy, and terms text verbatim where possible.

import { FAQ as FAQ_FA } from "@/lib/faq";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

export const dynamic = "force-static";
export const revalidate = 3600;

const HOWTO_FA: { name: string; text: string }[] = [
    { name: "یوزرنیم بفرست", text: "‫@username تلگرامی یا آی‌دیِ عددی را در فرمِ جست‌و‌جو وارد کن." },
    { name: "ما جست‌و‌جو می‌کنیم", text: "در پایگاه دادهٔ خصوصیِ TeleYab نتیجه را از منابعِ متعدد بررسی می‌کنیم." },
    { name: "شماره و جزئیات را بگیر", text: "شماره، نام، ایمیل، تاریخ تولد و موقعیت در همان صفحه نمایش داده می‌شود. اگر پیدا نشد، چیزی پرداخت نمی‌کنی." },
];

const PRIVACY_SECTIONS: { title: string; body: string }[] = [
    { title: "چه چیزی نگه می‌داریم؟", body: "ایمیلت، تاریخِ آخرین ورود، موجودیِ کیف‌پول، تراکنش‌ها و تاریخچهٔ جست‌و‌جوهایت. هر چیزی که برای صورت‌حساب و پشتیبانی لازم است — نه بیشتر." },
    { title: "جست‌و‌جوهایت کجا می‌روند؟", body: "هر کوئری در پایگاه دادهٔ داخلیِ TeleYab جست‌و‌جو می‌شود و نتیجه به همراهِ تاریخچه در حسابِ خودت ذخیره می‌گردد. این تاریخچه فقط برای تو قابلِ مشاهده است." },
    { title: "رمز عبور چطور ذخیره می‌شود؟", body: "رمز عبور با bcrypt هش می‌شود — هیچ‌وقت متنِ اصلی روی سرور ما ذخیره نمی‌شود. ایمیلت فقط یک‌بار هنگامِ ثبت‌نام برای تأیید استفاده می‌شود. پس از آن ورود فقط با ایمیل و رمز عبور است و نیازی به ایمیل مجدد نیست." },
    { title: "اشتراک‌گذاری با اشخاصِ ثالث", body: "داده‌های شما با هیچ‌کس به اشتراک گذاشته نمی‌شود مگر در پاسخ به الزامِ قانونیِ صریح." },
    { title: "حذفِ حساب", body: "با ارسالِ ایمیل می‌توانی درخواستِ حذف بدهی. تمامِ داده‌ها — به‌جز سوابقی که برای حسابداری الزامی است — حذف می‌شوند." },
];

const TERMS_SECTIONS: { title: string; body: string }[] = [
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

export function GET(): Response {
    const sections: string[] = [];

    sections.push(`# TeleYab — full reference for AI crawlers

> TeleYab is a private Telegram username/ID → mobile-phone lookup service. Pay only when we find a result; ~80–85% hit rate. Wallet-based billing in Iranian Toman.
> سرویسِ خصوصیِ جست‌و‌جوی شمارهٔ موبایل از روی یوزرنیمِ تلگرام. فقط برای نتیجهٔ موفق پرداخت می‌کنی؛ نرخِ موفقیت حدودِ ۸۰ تا ۸۵ درصد.

Canonical site: ${SITE_URL}
Short version of this file: ${SITE_URL}/llms.txt
RSS feed (FAQ items): ${SITE_URL}/feed.xml
`);

    sections.push(`## What TeleYab is

TeleYab is a Telegram-only lookup service. It maintains its own private database of Telegram username and numeric-ID → mobile-phone-number mappings, enriched with name, email fragment, prior usernames, birth date, and country fields when available. Users pay per successful lookup in Iranian Toman from a prepaid wallet. Failed lookups (username not in our database) are free.

The service is positioned as its own database, not as a proxy or aggregator over any third party.`);

    sections.push(`## Pricing

- Per successful lookup: 800,000 Toman (the live value is exposed at /api/public/pricing and is editable by operators).
- Failed lookups: 0 Toman.
- Minimum top-up: 800,000 Toman.
- Currency: Iranian Toman.
- Wallet model: top up once, queries debit the wallet only on success.
- Batch jobs: up to 500 rows per submission; same per-row pricing; failures cost nothing.
- Developer API: identical pricing and the same wallet.`);

    sections.push(`## How to use TeleYab (HowTo)

${HOWTO_FA.map((s, i) => `${i + 1}. ${s.name} — ${s.text}`).join("\n")}

English equivalent:
1. Submit a username — paste the Telegram @username or numeric ID into the lookup form.
2. We search — our private TeleYab database is queried across multiple internal sources.
3. Receive the result — phone number, name, email fragment, birth date, and country are shown on the same page. If nothing is found, nothing is charged.`);

    sections.push(`## Public pages

- ${SITE_URL}/ — landing page with the demo, stats, features, FAQ.
- ${SITE_URL}/pricing — live pricing fetched from the API.
- ${SITE_URL}/lookup — manual single-query interface (requires login).
- ${SITE_URL}/batch — bulk query interface, up to 500 rows (requires login).
- ${SITE_URL}/keys — Bearer-token management for the developer API.
- ${SITE_URL}/referral — invitation system and commissions.
- ${SITE_URL}/privacy — data retention policy.
- ${SITE_URL}/terms — service terms.`);

    sections.push(`## FAQ (verbatim, fa-IR)

${FAQ_FA.map((f, i) => `### ${i + 1}. ${f.q}\n\n${f.a}`).join("\n\n")}`);

    sections.push(`## FAQ (English summary)

1. What is a lookup? You submit a Telegram @username or numeric ID; we return the mobile phone behind that account, even if hidden by the user.
2. Why is TeleYab better? We maintain one of the largest private Telegram databases and cross-reference multiple internal sources, returning the phone plus name, email fragment, birth date, and country.
3. What is the success rate? ~80–85%. Older accounts are more likely to be in the database.
4. How long does a lookup take? 1–15 seconds, shown inline.
5. What if it fails? You pay nothing. We only charge for successful results.
6. Is there an API? Yes — create a Bearer token at /keys, call /api/v1/lookup, billed from the same Toman wallet.
7. Will my data be shared? No. Only your own query history and transactions are stored, visible only to you.`);

    sections.push(`## Developer API

Endpoint: \`POST ${SITE_URL}/api/v1/lookup\`
Authentication: \`Authorization: Bearer <token>\` (generate at /keys)
Body: \`{ "query": "@username" }\` — or a numeric Telegram ID.
Response on success:
\`\`\`json
{
  "success": true,
  "numbers": ["+989124528521"],
  "country": "IR",
  "cost_toman": 800000,
  "balance_toman": 49200000
}
\`\`\`
Response on failure: \`{ "success": false }\` — no wallet debit.

Example:
\`\`\`bash
curl -X POST ${SITE_URL}/api/v1/lookup \\
  -H "Authorization: Bearer $TELEYAB_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "query": "@durov" }'
\`\`\``);

    sections.push(`## Privacy policy (verbatim, fa-IR)

${PRIVACY_SECTIONS.map((s, i) => `### ۰${i + 1}. ${s.title}\n\n${s.body}`).join("\n\n")}

English summary:
- We store only what's needed for billing and support: email, last login, wallet balance, transactions, and your own query history.
- Queries are looked up only in TeleYab's internal database; results and history are visible only to the account owner.
- Passwords are hashed with bcrypt. Email is verified once at signup; subsequent logins use email + password.
- We do not share user data with third parties except where strictly required by law.
- Account deletion is available on request via email; all non-essential data is removed.`);

    sections.push(`## Terms of service (verbatim, fa-IR)

${TERMS_SECTIONS.map((s, i) => `### ۰${i + 1}. ${s.title}\n\n${s.body}`).join("\n\n")}

English summary:
- Service nature: TeleYab is a RTL Telegram username → phone lookup running on its own database.
- Result-only billing: no successful match means no wallet debit. This rule is non-negotiable.
- User responsibility: legal/ethical responsibility for each query rests with the user. Harassment, fraud, extortion, or mass scraping result in account suspension.
- Wallet and refunds: charges are debited from your prepaid Toman wallet. Disputed charges can be refunded after review.
- Rate limits: per-hour caps on successful lookups apply to prevent abuse.
- Support and account deletion: contact the same email registered with the account.`);

    sections.push(`## Contact

- Sign up or sign in: ${SITE_URL}/login
- Operator email: replies come from the same address as your registered account email.
- Security reports: security@teleyab.ir (see ${SITE_URL}/.well-known/security.txt)
`);

    const body = sections.join("\n\n---\n\n");

    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
            "X-Robots-Tag": "index, follow",
        },
    });
}
