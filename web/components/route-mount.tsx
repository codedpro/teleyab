"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { loadGsap } from "@/lib/motion";

/* Mounts a soft "chat-bubble" pop on every route change.  Reads
   pathname so the animation re-runs even without a remount.

   GSAP is lazy-loaded via loadGsap() so this client component does not
   pull ~40KB into the critical path. */
export default function RouteMount({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) return;
        let cancelled = false;
        loadGsap().then(({ gsap }) => {
            if (cancelled) return;
            gsap.fromTo(
                el,
                { opacity: 0, y: 10, filter: "blur(4px)" },
                { opacity: 1, y: 0, filter: "blur(0)", duration: 0.5, ease: "power3.out" },
            );
        });
        return () => {
            cancelled = true;
        };
    }, [pathname]);
    return <div ref={ref}>{children}</div>;
}
