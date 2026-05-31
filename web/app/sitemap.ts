import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

// Static lastmod for cache-friendliness and consistent crawl signals.
const LAST_MOD = new Date("2026-05-19T00:00:00.000Z");

type Entry = {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

export default function sitemap(): MetadataRoute.Sitemap {
    const pages: Entry[] = [
        { path: "/",         priority: 1.0, changeFrequency: "weekly"  },
        { path: "/pricing",  priority: 0.9, changeFrequency: "weekly"  },
        { path: "/lookup",   priority: 0.8, changeFrequency: "monthly" },
        { path: "/batch",    priority: 0.7, changeFrequency: "monthly" },
        { path: "/keys",     priority: 0.7, changeFrequency: "monthly" },
        { path: "/referral", priority: 0.6, changeFrequency: "monthly" },
        { path: "/privacy",         priority: 0.4, changeFrequency: "yearly"  },
        { path: "/terms",           priority: 0.4, changeFrequency: "yearly"  },
        { path: "/forgot-password", priority: 0.3, changeFrequency: "yearly"  },
        { path: "/reset-password",  priority: 0.3, changeFrequency: "yearly"  },
        // Note: /login, /verify, /wallet, /topup are intentionally excluded —
        // private/user-state routes are blocked in robots.ts.
    ];

    return pages.map(({ path, priority, changeFrequency }) => ({
        url: `${SITE_URL}${path}`,
        lastModified: LAST_MOD,
        priority,
        changeFrequency,
    }));
}
