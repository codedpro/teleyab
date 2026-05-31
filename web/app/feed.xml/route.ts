// feed.xml — minimal RSS 2.0 exposing the FAQ items so AI crawlers can ingest them.

import { FAQ } from "@/lib/faq";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

// Static publish date — keep aligned with sitemap lastmod.
const PUB_DATE = new Date("2026-05-19T00:00:00.000Z").toUTCString();

export const dynamic = "force-static";
export const revalidate = 3600;

function xmlEscape(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export function GET(): Response {
    const items = FAQ.map((f, i) => {
        const link = `${SITE_URL}/#faq-${i + 1}`;
        return `    <item>
      <title>${xmlEscape(f.q)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="false">teleyab-faq-${i + 1}</guid>
      <pubDate>${PUB_DATE}</pubDate>
      <description>${xmlEscape(f.a)}</description>
    </item>`;
    }).join("\n");

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TeleYab — پرسش‌های پرتکرار</title>
    <link>${xmlEscape(SITE_URL)}/</link>
    <atom:link href="${xmlEscape(SITE_URL)}/feed.xml" rel="self" type="application/rss+xml" />
    <description>پرسش‌های پرتکرارِ TeleYab — سرویسِ جست‌و‌جوی شمارهٔ موبایل از روی یوزرنیمِ تلگرام.</description>
    <language>fa-IR</language>
    <lastBuildDate>${PUB_DATE}</lastBuildDate>
${items}
  </channel>
</rss>
`;

    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
            "X-Robots-Tag": "index, follow",
        },
    });
}
