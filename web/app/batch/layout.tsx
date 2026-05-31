import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "جست‌و‌جوی دسته‌ای — تا ۵۰۰ ردیف در یک batch",
    description:
        "تا ۵۰۰ یوزرنیمِ تلگرام را در یک batch جست‌و‌جو کن. هزینهٔ هر ردیفِ موفق برابر با یک جست‌و‌جوی تکی است؛ شکست رایگان.",
    alternates: { canonical: "/batch" },
};

export default function BatchLayout({ children }: { children: React.ReactNode }) {
    return children;
}
