import type { Metadata } from "next";
import { ServiceLD } from "@/components/schema-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teleyab.ir";

export const metadata: Metadata = {
    title: "تعرفه — هزینهٔ هر جست‌و‌جوی موفق",
    description:
        "تعرفهٔ زندهٔ TeleYab به تومان — فقط برای جست‌و‌جوی موفق پرداخت می‌کنی. بدون اشتراکِ ماهانه. شکست؟ صفر تومان.",
    alternates: { canonical: "/pricing" },
};

// Always render this layout server-side at request time so the Offer
// JSON-LD reflects the live admin-set price, not the build-time snapshot.
export const dynamic = "force-dynamic";

async function fetchLivePrice(): Promise<number | null> {
    try {
        const goOrigin = process.env.GO_ORIGIN ?? "http://api:8084";
        const r = await fetch(`${goOrigin}/api/public/pricing`, { cache: "no-store" });
        if (!r.ok) return null;
        const j = await r.json();
        const v = j?.price_per_lookup_toman;
        return typeof v === "number" ? v : null;
    } catch {
        return null;
    }
}

export default async function PricingLayout({ children }: { children: React.ReactNode }) {
    const price = await fetchLivePrice();
    return (
        <>
            <ServiceLD siteUrl={SITE_URL} priceToman={price} />
            {children}
        </>
    );
}
