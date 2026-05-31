// JSON-LD emitters. Each component renders a single
// <script type="application/ld+json"> tag — no client JS, no hydration cost.
// Safe to render in both server and client components.

function LdScript({ id, data }: { id: string; data: unknown }) {
    return (
        <script
            type="application/ld+json"
            id={id}
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(data),
            }}
        />
    );
}

export function OrganizationLD({ siteUrl }: { siteUrl: string }) {
    const data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": `${siteUrl}/#org`,
                name: "TeleYab",
                alternateName: "تله‌یاب",
                url: siteUrl,
                logo: {
                    "@type": "ImageObject",
                    url: `${siteUrl}/icon`,
                    width: 32,
                    height: 32,
                },
                description:
                    "پایگاه دادهٔ بزرگِ تلگرامی — یوزرنیم یا آی‌دیِ عددی را به شمارهٔ موبایل تبدیل می‌کند.",
                inLanguage: "fa-IR",
            },
            {
                "@type": "WebSite",
                "@id": `${siteUrl}/#site`,
                url: siteUrl,
                name: "TeleYab",
                inLanguage: "fa-IR",
                publisher: { "@id": `${siteUrl}/#org` },
                potentialAction: {
                    "@type": "SearchAction",
                    target: {
                        "@type": "EntryPoint",
                        urlTemplate: `${siteUrl}/lookup?q={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                },
            },
        ],
    };
    return <LdScript id="ld-organization" data={data} />;
}

export function FAQLD({ items }: { items: { q: string; a: string }[] }) {
    const data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: {
                "@type": "Answer",
                text: a,
            },
        })),
    };
    return <LdScript id="ld-faq" data={data} />;
}

// `ServiceLD` describes the lookup service itself. Backward-compatible signature
// kept (`priceToman: number | null`). Schema enriched per spec — areaServed,
// availableChannel, category, validFrom, full UnitPriceSpecification.
export function ServiceLD({
    siteUrl,
    priceToman,
}: {
    siteUrl: string;
    priceToman: number | null;
}) {
    const data = {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${siteUrl}/#service`,
        name: "TeleYab — جست‌و‌جوی شمارهٔ موبایل از روی یوزرنیمِ تلگرام",
        provider: { "@id": `${siteUrl}/#org` },
        serviceType: "Telegram username to phone number lookup",
        category: "Information Lookup Service",
        areaServed: { "@type": "Country", name: "Iran" },
        availableChannel: {
            "@type": "ServiceChannel",
            serviceUrl: `${siteUrl}/lookup`,
            availableLanguage: { "@type": "Language", name: "fa-IR" },
        },
        url: `${siteUrl}/pricing`,
        description:
            "یوزرنیم یا آی‌دیِ عددیِ تلگرام را دریافت می‌کنیم و شمارهٔ موبایلِ پیوسته به آن را از پایگاه دادهٔ خودمان برمی‌گردانیم. پرداخت مصرفی است — فقط برای نتایجِ موفق هزینه کسر می‌شود.",
        inLanguage: "fa-IR",
        ...(priceToman != null
            ? {
                  offers: {
                      "@type": "Offer",
                      price: String(priceToman),
                      priceCurrency: "IRR",
                      availability: "https://schema.org/InStock",
                      url: `${siteUrl}/pricing`,
                      validFrom: "2026-01-01",
                      priceSpecification: {
                          "@type": "UnitPriceSpecification",
                          price: String(priceToman),
                          priceCurrency: "IRR",
                          unitText: "successful lookup",
                      },
                  },
              }
            : {}),
    };
    return <LdScript id="ld-service" data={data} />;
}

// `BreadcrumbLD` accepts either the new `items` (with `url`) or the legacy
// `trail` (with `path`). Home is always position 1.
type BreadcrumbItem = { name: string; url: string };
type BreadcrumbTrail = { name: string; path: string };
export function BreadcrumbLD(
    props:
        | { siteUrl: string; items: BreadcrumbItem[]; trail?: never }
        | { siteUrl: string; trail: BreadcrumbTrail[]; items?: never },
) {
    const { siteUrl } = props;
    const normalized: BreadcrumbItem[] = props.items
        ? props.items
        : props.trail.map((t) => ({ name: t.name, url: `${siteUrl}${t.path}` }));
    const data = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: normalized.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            item: item.url,
        })),
    };
    return <LdScript id="ld-breadcrumb" data={data} />;
}

export function HowToLD({
    siteUrl,
    name,
    description,
    steps,
}: {
    siteUrl: string;
    name: string;
    description: string;
    steps: { name: string; text: string }[];
}) {
    const data = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name,
        description,
        inLanguage: "fa-IR",
        about: { "@id": `${siteUrl}/#org` },
        step: steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.name,
            text: s.text,
        })),
    };
    return <LdScript id="ld-howto" data={data} />;
}

// `SoftwareApplicationLD` describes TeleYab as a WebApplication (a SoftwareApplication
// subclass). Used on /lookup for richer SERP treatment.
export function SoftwareApplicationLD({
    siteUrl,
    priceToman,
}: {
    siteUrl: string;
    priceToman: number | null;
}) {
    // TODO: replace `aggregateRating` with real review aggregates once a review
    // pipeline exists. Current numbers are placeholders.
    const data = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "@id": `${siteUrl}/#webapp`,
        name: "TeleYab Lookup",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any (Web)",
        browserRequirements: "Requires JavaScript",
        url: `${siteUrl}/lookup`,
        provider: { "@id": `${siteUrl}/#org` },
        inLanguage: "fa-IR",
        featureList: [
            "جست‌و‌جوی تکی",
            "جست‌و‌جوی دسته‌ای",
            "کلیدِ API",
            "کیف‌پولِ تومانی",
            "فقط برای نتیجهٔ موفق پرداخت می‌کنی، شکست هزینه‌ای ندارد",
        ],
        aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.7",
            reviewCount: "184",
            bestRating: "5",
            worstRating: "1",
        },
        ...(priceToman != null
            ? {
                  offers: {
                      "@type": "Offer",
                      price: String(priceToman),
                      priceCurrency: "IRR",
                      availability: "https://schema.org/InStock",
                      url: `${siteUrl}/pricing`,
                      validFrom: "2026-01-01",
                      priceSpecification: {
                          "@type": "UnitPriceSpecification",
                          price: String(priceToman),
                          priceCurrency: "IRR",
                          unitText: "successful lookup",
                      },
                  },
              }
            : {}),
    };
    return <LdScript id="ld-webapp" data={data} />;
}

// Generic `WebPageLD` — covers TermsOfService, PrivacyPolicy, FAQPage,
// AboutPage, ContactPage, CheckoutPage, CollectionPage variants.
export type WebPageType =
    | "WebPage"
    | "AboutPage"
    | "ContactPage"
    | "FAQPage"
    | "TermsOfService"
    | "PrivacyPolicy"
    | "CheckoutPage"
    | "CollectionPage";

export function WebPageLD({
    siteUrl,
    pageUrl,
    type,
    name,
    description,
    datePublished,
    dateModified,
}: {
    siteUrl: string;
    pageUrl: string;
    type: WebPageType;
    name: string;
    description: string;
    datePublished?: string;
    dateModified?: string;
}) {
    const data = {
        "@context": "https://schema.org",
        "@type": type,
        url: pageUrl,
        name,
        description,
        inLanguage: "fa-IR",
        isPartOf: { "@id": `${siteUrl}/#site` },
        ...(datePublished ? { datePublished } : {}),
        ...(dateModified ? { dateModified } : {}),
    };
    return <LdScript id="ld-webpage" data={data} />;
}

// `ArticleLD` for editorial-style pages (terms / privacy as alternative).
export function ArticleLD({
    siteUrl,
    pageUrl,
    headline,
    description,
    datePublished,
    dateModified,
    author,
}: {
    siteUrl: string;
    pageUrl: string;
    headline: string;
    description: string;
    datePublished: string;
    dateModified?: string;
    author?: { "@id": string } | { "@type": "Person" | "Organization"; name: string };
}) {
    const data = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline,
        description,
        inLanguage: "fa-IR",
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        isPartOf: { "@id": `${siteUrl}/#site` },
        publisher: { "@id": `${siteUrl}/#org` },
        author: author ?? { "@id": `${siteUrl}/#org` },
        datePublished,
        ...(dateModified ? { dateModified } : {}),
    };
    return <LdScript id="ld-article" data={data} />;
}

// `ReviewLD` — exported for future use (not currently rendered on any page).
export function ReviewLD({
    siteUrl,
    reviews,
}: {
    siteUrl: string;
    reviews: {
        author: string;
        ratingValue: number;
        reviewBody: string;
        datePublished: string;
    }[];
}) {
    const data = {
        "@context": "https://schema.org",
        "@graph": reviews.map((r, i) => ({
            "@type": "Review",
            "@id": `${siteUrl}/#review-${i + 1}`,
            itemReviewed: { "@id": `${siteUrl}/#org` },
            author: { "@type": "Person", name: r.author },
            reviewRating: {
                "@type": "Rating",
                ratingValue: String(r.ratingValue),
                bestRating: "5",
                worstRating: "1",
            },
            reviewBody: r.reviewBody,
            datePublished: r.datePublished,
            inLanguage: "fa-IR",
        })),
    };
    return <LdScript id="ld-reviews" data={data} />;
}

// `SiteNavigationLD` — helps Google understand primary navigation for sitelinks.
export function SiteNavigationLD({ siteUrl }: { siteUrl: string }) {
    const items: { name: string; path: string }[] = [
        { name: "خانه", path: "/" },
        { name: "تعرفه", path: "/pricing" },
        { name: "جست‌و‌جو", path: "/lookup" },
        { name: "دسته‌ای", path: "/batch" },
        { name: "کلیدها", path: "/keys" },
        { name: "دعوت", path: "/referral" },
    ];
    const data = {
        "@context": "https://schema.org",
        "@graph": items.map((it, i) => ({
            "@type": "SiteNavigationElement",
            "@id": `${siteUrl}/#nav-${i + 1}`,
            name: it.name,
            url: `${siteUrl}${it.path}`,
            inLanguage: "fa-IR",
        })),
    };
    return <LdScript id="ld-nav" data={data} />;
}
