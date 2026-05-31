import type { Metadata } from "next";

export const metadata: Metadata = {
    title: { default: "Admin · TeleYab", template: "%s · Admin · TeleYab" },
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <div className="pointer-events-none fixed end-4 top-4 z-50 sm:end-6 sm:top-6">
                <span className="t-chip t-chip-brand pointer-events-auto shadow-sm">
                    <span className="dot-live" />
                    ادمین · آنلاین
                </span>
            </div>
            {children}
        </>
    );
}
