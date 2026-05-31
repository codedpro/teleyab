import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ورود و ثبت‌نام در TeleYab",
    description:
        "ورود یا ثبت‌نام در TeleYab با ایمیل و رمز عبور. پس از ثبت‌نام، کیف پولِ تومانیِ خودت را شارژ کن و شروع به جست‌و‌جو کن.",
    alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return children;
}
