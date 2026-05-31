import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "تنظیمِ رمزِ جدید · TeleYab",
    description: "تنظیمِ رمزِ جدید برای حسابِ TeleYab.",
    alternates: { canonical: "/reset-password" },
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false },
    },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
    return children;
}
