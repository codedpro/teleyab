import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "کاربر · ادمین",
    description: "جزئیاتِ کاربر در داشبوردِ مدیریتیِ TeleYab.",
    robots: {
        index: false,
        follow: false,
        nocache: true,
        noarchive: true,
        nosnippet: true,
        noimageindex: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            "max-snippet": -1,
        },
    },
};

export default function AdminUserDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
