import type { NextConfig } from "next";

const GO_ORIGIN = process.env.GO_ORIGIN ?? "http://127.0.0.1:8084";

// Base security headers — applied to every route.
const SECURITY_HEADERS = [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// Indexable surfaces — everything except private/state routes.
const INDEXABLE_ROBOTS = {
    key: "X-Robots-Tag",
    value: "index, follow, max-image-preview:large, max-snippet:-1",
};

// Private/state routes that must not be indexed.
const NOINDEX_ROBOTS = {
    key: "X-Robots-Tag",
    value: "noindex, nofollow",
};

// SEO/discovery assets that benefit from longer edge cache.
const ASSET_CACHE = {
    key: "Cache-Control",
    value: "public, max-age=3600, s-maxage=86400",
};

const NOINDEX_PATHS = [
    "/admin/:path*",
    "/admin",
    "/wallet/:path*",
    "/wallet",
    "/topup/:path*",
    "/topup",
    "/verify/:path*",
    "/verify",
    "/forgot-password/:path*",
    "/forgot-password",
    "/reset-password/:path*",
    "/reset-password",
    "/api/:path*",
];

const ASSET_PATHS = [
    "/sitemap.xml",
    "/robots.txt",
    "/llms.txt",
    "/llms-full.txt",
    "/feed.xml",
    "/humans.txt",
    "/.well-known/security.txt",
];

const nextConfig: NextConfig = {
    output: "standalone",
    poweredByHeader: false,
    async rewrites() {
        return [
            { source: "/api/:path*", destination: `${GO_ORIGIN}/api/:path*` },
        ];
    },
    async headers() {
        return [
            // 1. Baseline security headers + permissive index tag on everything.
            {
                source: "/:path*",
                headers: [...SECURITY_HEADERS, INDEXABLE_ROBOTS],
            },
            // 2. Override the robots tag on private/state surfaces.
            ...NOINDEX_PATHS.map((source) => ({
                source,
                headers: [NOINDEX_ROBOTS],
            })),
            // 3. Long-cache the discovery assets.
            ...ASSET_PATHS.map((source) => ({
                source,
                headers: [ASSET_CACHE],
            })),
        ];
    },
};

export default nextConfig;
