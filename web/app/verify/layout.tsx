import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "تأییدِ ایمیل",
    description: "تأییدِ ایمیلِ ثبت‌نامِ TeleYab.",
    alternates: { canonical: "/verify" },
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false },
    },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
