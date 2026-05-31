// llms.txt — short, machine-readable summary for LLM crawlers.
// Convention: https://llmstxt.org/

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET(): Response {
    const body = `# TeleYab

> TeleYab is a private Telegram username/ID → mobile-phone lookup service. Pay only when we find a result; success rate is ~80–85%.
> سرویسِ خصوصیِ جست‌و‌جوی شمارهٔ موبایل از روی یوزرنیمِ تلگرام یا آی‌دیِ عددی. فقط برای نتیجهٔ موفق پرداخت می‌کنی؛ نرخِ موفقیت حدودِ ۸۰ تا ۸۵ درصد است.

TeleYab maintains its own private database of Telegram username ↔ mobile-phone mappings. The service is Telegram-only. Results may include the phone number plus enrichment fields (name, email fragment, prior usernames, birth date, country) when available.

## Product

- Single lookup — paste a @username or numeric Telegram ID and get the phone number back.
- Batch lookup — up to 500 rows per submission; failures cost nothing.
- Developer API — Bearer-token endpoint with the same wallet billing.
- Wallet — top up once in Toman, spend as you query. Transparent transaction log.
- "Result-only" billing — if the username is not in our database, the wallet is not charged.

## Pricing

- Currency: Iranian Toman (IRR/تومان).
- Per successful lookup: 800,000 Toman (live value at /api/public/pricing).
- Failed lookup: free — wallet is not debited.
- Minimum top-up: 800,000 Toman (one successful lookup).
- No monthly subscription, no minimum top-up enforced by SLA.
- Refunds for disputed charges can be requested by email; see /terms.

## Pages

- [Home](${SITE_URL}/): product overview, live demo, FAQ.
- [Pricing](${SITE_URL}/pricing): live per-lookup price + worked examples.
- [Lookup](${SITE_URL}/lookup): the manual single-query form (requires login).
- [Batch](${SITE_URL}/batch): bulk query interface (requires login).
- [Keys](${SITE_URL}/keys): Bearer-token management for the developer API.
- [Referral](${SITE_URL}/referral): invite link + commission terms.
- [Privacy](${SITE_URL}/privacy): data retention and deletion policy.
- [Terms](${SITE_URL}/terms): service terms including the "only-pay-on-success" rule.

## FAQ

Q: What is a lookup?
A: You send a Telegram @username or numeric ID; we return the mobile phone number attached to that account.

پ: لوک‌آپ چیست؟
ج: یوزرنیمِ تلگرامی (مثل @username) یا آی‌دیِ عددی را می‌فرستی. ما شمارهٔ موبایلِ متصل به آن حساب را برمی‌گردانیم.

Q: What is the success rate?
A: ~80–85%. Older accounts are more likely to be in the database.

پ: نرخِ موفقیت چقدر است؟
ج: حدودِ ۸۰ تا ۸۵ درصد. حساب‌های قدیمی‌تر احتمالِ بیشتری دارند.

Q: How long does a lookup take?
A: Typically 1–15 seconds. Result is shown on the same page.

پ: جست‌و‌جو چقدر طول می‌کشد؟
ج: بینِ ۱ تا ۱۵ ثانیه؛ نتیجه روی همان صفحه نمایش داده می‌شود.

Q: What happens if the lookup fails?
A: Nothing is charged. The wallet is debited only on a successful result.

پ: اگر جست‌و‌جو ناموفق بود چه؟
ج: هیچ هزینه‌ای از کیف‌پولت کسر نمی‌شود.

Q: Do you offer a developer API?
A: Yes. Create a Bearer token on /keys and call /api/v1/lookup. Billed from the same Toman wallet.

پ: API برای توسعه‌دهنده دارید؟
ج: بله. در صفحهٔ کلیدها یک Bearer token می‌سازی و از endpoint /api/v1/lookup استفاده می‌کنی.

Q: Will my data be published anywhere?
A: No. We only keep your own query history and transactions, visible only to you in the dashboard.

پ: آیا داده‌های من جایی منتشر می‌شود؟
ج: خیر. تنها چیزی که نگه می‌داریم تاریخچهٔ کوئری‌ها و تراکنش‌های خودِ توست.

Q: Which platforms beyond Telegram are supported?
A: None. TeleYab is Telegram-only.

پ: آیا پلتفرم‌های دیگری پشتیبانی می‌شوند؟
ج: خیر. TeleYab فقط مخصوصِ تلگرام است.

## API

\`\`\`bash
curl -X POST ${SITE_URL}/api/v1/lookup \\
  -H "Authorization: Bearer $TELEYAB_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "query": "@durov" }'
\`\`\`

A successful response includes \`success\`, \`numbers\`, \`country\`, \`cost_toman\`, and the updated \`balance_toman\`. Failures return \`success: false\` and do not debit the wallet.

## Contact

- Sign in or sign up at ${SITE_URL}/login.
- Operator email is the same as the account email — replies come from the address you registered with.
- Security reports: security@teleyab.ir (see /.well-known/security.txt).
`;

    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
            "X-Robots-Tag": "index, follow",
        },
    });
}
