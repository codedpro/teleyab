import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "API و Bearer Token — جست‌و‌جوی تلگرامی برای توسعه‌دهنده",
    description:
        "Bearer token بساز و از endpoint /api/v1/lookup استفاده کن. صورت‌حساب همان کیف پولِ تومانیِ توست. سازگار با هر کلاینتِ HTTP.",
    alternates: { canonical: "/keys" },
};

export default function KeysLayout({ children }: { children: React.ReactNode }) {
    return children;
}
