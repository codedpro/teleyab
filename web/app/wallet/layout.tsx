import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "کیف پولِ تومانی",
    description: "تاریخچهٔ تراکنش‌ها و موجودیِ کیف پولِ TeleYab.",
    alternates: { canonical: "/wallet" },
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false },
    },
};

export default function WalletLayout({ children }: { children: React.ReactNode }) {
    return children;
}
