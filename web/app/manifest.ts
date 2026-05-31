import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "TeleYab — یوزرنیمِ تلگرام به شماره",
        short_name: "TeleYab",
        description:
            "یوزرنیمِ تلگرامی یا آی‌دیِ عددی را بده، شمارهٔ موبایلش را برمی‌گردانیم. فقط برای نتیجهٔ موفق پرداخت می‌کنی.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#229ED9",
        lang: "fa-IR",
        dir: "rtl",
        categories: ["utilities", "productivity", "social"],
        icons: [
            { src: "/icon",       sizes: "32x32",   type: "image/png" },
            { src: "/icon",       sizes: "192x192", type: "image/png" },
            { src: "/apple-icon", sizes: "180x180", type: "image/png" },
            { src: "/apple-icon", sizes: "512x512", type: "image/png" },
        ],
    };
}
