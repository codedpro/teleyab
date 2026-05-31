import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

const PRIVATE_PATHS = [
    "/admin/",
    "/admin",
    "/wallet",
    "/topup",
    "/verify",
    "/login",
    "/reset-password",
    "/api/",
];

const AI_BOTS = [
    "GPTBot",
    "ClaudeBot",
    "Claude-Web",
    "PerplexityBot",
    "Google-Extended",
    "OAI-SearchBot",
    "Applebot-Extended",
    "Bingbot",
    "FacebookExternalHit",
    "Twitterbot",
    "CCBot",
    "cohere-ai",
    "Meta-ExternalAgent",
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            // Default policy — index everything public, block private/state surfaces.
            {
                userAgent: "*",
                allow: "/",
                disallow: PRIVATE_PATHS,
            },
            // AI crawlers — explicitly opt-in to the public corpus + llms files.
            {
                userAgent: AI_BOTS,
                allow: ["/", "/llms.txt", "/llms-full.txt"],
                disallow: PRIVATE_PATHS,
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
