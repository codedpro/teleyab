import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "جست‌و‌جو — یوزرنیمِ تلگرام به شماره",
    description:
        "یوزرنیمِ تلگرامی (@username) یا آی‌دیِ عددی را وارد کن. اگر در دیتابیسِ TeleYab باشد، شمارهٔ موبایلش را برمی‌گردانیم. اگر پیدا نشد، چیزی پرداخت نمی‌کنی.",
    alternates: { canonical: "/lookup" },
};

export default function LookupLayout({ children }: { children: React.ReactNode }) {
    return children;
}
