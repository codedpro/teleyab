import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "بازنشانیِ رمز عبور · TeleYab",
    description:
        "رمز عبورت را فراموش کرده‌ای؟ ایمیلت را بنویس تا لینکِ بازنشانی برایت ارسال شود.",
    alternates: { canonical: "/forgot-password" },
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false },
    },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
    return children;
}
