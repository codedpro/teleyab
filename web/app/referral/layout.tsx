import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "دعوت — کارمزدِ معرفی به TeleYab",
    description:
        "کدِ دعوتت را به اشتراک بگذار. هر کاربری که با کدِ تو ثبت‌نام کند، هر دو طرف بونوسِ کیف پول می‌گیرید.",
    alternates: { canonical: "/referral" },
};

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
    return children;
}
