import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "وضعیتِ دسته · TeleYab",
    description:
        "وضعیتِ زندهٔ دستهٔ جست‌و‌جوی تلگرام در TeleYab — پیشرفت، ردیف‌های موفق و هزینهٔ کل به تومان.",
    alternates: { canonical: "/batch" },
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false },
    },
};

export default function BatchDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
