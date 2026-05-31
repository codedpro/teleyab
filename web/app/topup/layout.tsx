import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "شارژِ کیف پول",
    description: "شارژِ کیف پولِ TeleYab از طریقِ کارت به کارت.",
    alternates: { canonical: "/topup" },
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false },
    },
};

export default function TopupLayout({ children }: { children: React.ReactNode }) {
    return children;
}
