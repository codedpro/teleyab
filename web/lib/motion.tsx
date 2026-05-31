"use client";

import {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from "react";
// Type-only import of the gsap namespace so we can reference
// `gsap.Context` / `gsap.core.Tween` without pulling runtime code.
// `import type` is fully erased by the compiler — no bundle cost.
import type gsap from "gsap";
type GsapType = typeof gsap;

/* ───────────────── lazy gsap loader ─────────────────
   GSAP + ScrollTrigger together are ~40KB minified.  Importing them at
   module-top forces every page that touches motion.tsx to pay that cost
   on first paint.  Instead we lazy-load on first effect, register the
   plugin exactly once, and cache the resolved module on a singleton
   promise so concurrent callers share the same fetch. */

type GsapModule = {
    gsap: GsapType;
    ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
};

let gsapPromise: Promise<GsapModule> | null = null;

export function loadGsap(): Promise<GsapModule> {
    if (typeof window === "undefined") {
        // SSR — never resolve (callers only invoke from effect).
        return new Promise<GsapModule>(() => { /* noop */ });
    }
    if (!gsapPromise) {
        gsapPromise = (async () => {
            const [gsapMod, scrollMod] = await Promise.all([
                import("gsap"),
                import("gsap/ScrollTrigger"),
            ]);
            const { gsap } = gsapMod;
            const { ScrollTrigger } = scrollMod;
            gsap.registerPlugin(ScrollTrigger);
            return { gsap, ScrollTrigger };
        })();
    }
    return gsapPromise;
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function prefersReducedMotion() {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ───────────────── core gsap hook ─────────────────
   Runs `setup(ctx, scope)` once inside a gsap.context bound to `scope`.
   On unmount the context reverts every tween/ScrollTrigger created inside.
   The gsap module is loaded lazily; if the component unmounts before the
   module resolves, we set a `cancelled` flag and never create the context.
*/
export function useGsap(
    setup: (ctx: gsap.Context, scope: HTMLElement) => void,
    deps: ReadonlyArray<unknown> = [],
): RefObject<HTMLDivElement | null> {
    const scope = useRef<HTMLDivElement>(null);
    useIsoLayoutEffect(() => {
        if (!scope.current) return;
        // Skip the import entirely for reduced-motion users.
        if (prefersReducedMotion()) return;
        const el = scope.current;
        let cancelled = false;
        let ctx: gsap.Context | null = null;
        loadGsap().then(({ gsap }) => {
            if (cancelled) return;
            ctx = gsap.context((self) => setup(self, el), el);
        });
        return () => {
            cancelled = true;
            ctx?.revert();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return scope;
}

/* ───────────────── ChatReveal ─────────────────
   Wraps a list of nodes and reveals them one-by-one with a chat-bubble
   pop. Each child becomes a chat-bubble step.
*/
export function ChatReveal({
    children,
    delay = 0,
    stagger = 0.18,
    className,
}: {
    children: ReactNode;
    delay?: number;
    stagger?: number;
    className?: string;
}) {
    const ref = useGsap(
        (_ctx, el) => {
            // useGsap already short-circuits on reduced motion.
            const items = el.querySelectorAll<HTMLElement>(":scope > *");
            // gsap is in scope inside the context-bound callback because
            // useGsap only invokes setup once loadGsap() has resolved.
            // We access it through the registered global to keep the
            // signature stable for callers.
            void loadGsap().then(({ gsap }) => {
                gsap.from(items, {
                    y: 18,
                    opacity: 0,
                    scale: 0.92,
                    duration: 0.55,
                    ease: "back.out(1.6)",
                    stagger,
                    delay,
                    scrollTrigger: {
                        trigger: el,
                        start: "top 85%",
                        once: true,
                    },
                });
            });
        },
        [delay, stagger],
    );
    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}

/* ───────────────── ScrollReveal ─────────────────
   Generic single-element reveal. Use for headers, cards, prose blocks.
*/
export function ScrollReveal({
    children,
    y = 24,
    delay = 0,
    duration = 0.7,
    className,
    as: As = "div",
}: {
    children: ReactNode;
    y?: number;
    delay?: number;
    duration?: number;
    className?: string;
    as?: keyof React.JSX.IntrinsicElements;
}) {
    const ref = useGsap(
        (_ctx, el) => {
            void loadGsap().then(({ gsap }) => {
                gsap.from(el, {
                    y,
                    opacity: 0,
                    filter: "blur(6px)",
                    duration,
                    ease: "power3.out",
                    delay,
                    scrollTrigger: { trigger: el, start: "top 88%", once: true },
                });
            });
        },
        [y, delay, duration],
    );
    const Tag = As as unknown as "div";
    return (
        <Tag ref={ref as unknown as RefObject<HTMLDivElement>} className={className}>
            {children}
        </Tag>
    );
}

/* ───────────────── StaggerChildren ─────────────────
   Reveals direct children with a stagger when the container enters view.
*/
export function StaggerChildren({
    children,
    stagger = 0.08,
    y = 18,
    className,
    start = "top 85%",
}: {
    children: ReactNode;
    stagger?: number;
    y?: number;
    className?: string;
    start?: string;
}) {
    const ref = useGsap(
        (_ctx, el) => {
            const items = el.querySelectorAll<HTMLElement>(":scope > *");
            void loadGsap().then(({ gsap }) => {
                gsap.from(items, {
                    y,
                    opacity: 0,
                    duration: 0.6,
                    ease: "power3.out",
                    stagger,
                    scrollTrigger: { trigger: el, start, once: true },
                });
            });
        },
        [stagger, y, start],
    );
    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}

/* ───────────────── ParallaxBlob ─────────────────
   A subtle scroll-linked blob that drifts at a different speed.
*/
export function ParallaxBlob({
    className,
    speed = 0.3,
}: {
    className?: string;
    speed?: number;
}) {
    const ref = useGsap(
        (_ctx, el) => {
            void loadGsap().then(({ gsap }) => {
                gsap.to(el, {
                    yPercent: -speed * 100,
                    ease: "none",
                    scrollTrigger: {
                        trigger: el.parentElement ?? el,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: true,
                    },
                });
            });
        },
        [speed],
    );
    return <div ref={ref} className={className} aria-hidden />;
}

/* ───────────────── Typewriter ─────────────────
   Live-types a string of text, char by char.  RTL-safe — we just append
   characters into a span; the host element governs direction.

   NOTE: Stays sync — uses requestAnimationFrame, no gsap dependency.
*/
export function Typewriter({
    text,
    speed = 32,
    startDelay = 0,
    className,
    cursor = true,
    dir,
    onDone,
}: {
    text: string;
    speed?: number;
    startDelay?: number;
    className?: string;
    cursor?: boolean;
    dir?: "ltr" | "rtl" | "auto";
    onDone?: () => void;
}) {
    const [out, setOut] = useState("");
    const [done, setDone] = useState(false);
    useEffect(() => {
        if (prefersReducedMotion()) {
            setOut(text);
            setDone(true);
            onDone?.();
            return;
        }
        let i = 0;
        let raf = 0;
        const startT = performance.now() + startDelay;
        const tick = (now: number) => {
            if (now < startT) {
                raf = requestAnimationFrame(tick);
                return;
            }
            const target = Math.min(text.length, Math.floor((now - startT) / speed));
            if (target !== i) {
                i = target;
                setOut(text.slice(0, i));
            }
            if (i < text.length) raf = requestAnimationFrame(tick);
            else {
                setDone(true);
                onDone?.();
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text]);
    return (
        <span className={className} dir={dir}>
            {out}
            {cursor && !done ? <span className="tw-cursor">▌</span> : null}
        </span>
    );
}

/* ───────────────── CountUp ─────────────────
   Animates a number from 0 → n when it scrolls into view.  fa-IR digits.
*/
export function CountUp({
    to,
    duration = 1.4,
    suffix = "",
    className,
    locale = "fa-IR",
    decimals = 0,
}: {
    to: number;
    duration?: number;
    suffix?: string;
    className?: string;
    locale?: string;
    decimals?: number;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const fmt = useMemo(
        () =>
            new Intl.NumberFormat(locale, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            }),
        [locale, decimals],
    );
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (prefersReducedMotion()) {
            el.textContent = fmt.format(to) + suffix;
            return;
        }
        let cancelled = false;
        let tween: gsap.core.Tween | null = null;
        loadGsap().then(({ gsap }) => {
            if (cancelled) return;
            const obj = { v: 0 };
            tween = gsap.to(obj, {
                v: to,
                duration,
                ease: "power2.out",
                onUpdate: () => {
                    el.textContent = fmt.format(obj.v) + suffix;
                },
                scrollTrigger: { trigger: el, start: "top 90%", once: true },
            });
        });
        return () => {
            cancelled = true;
            tween?.scrollTrigger?.kill();
            tween?.kill();
        };
    }, [to, duration, suffix, fmt]);
    return <span ref={ref} className={className}>{fmt.format(0) + suffix}</span>;
}

/* ───────────────── MagneticHover ─────────────────
   Subtle cursor-tracking for CTAs.
*/
export function MagneticHover({
    children,
    strength = 14,
    className,
}: {
    children: ReactNode;
    strength?: number;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (prefersReducedMotion()) return;
        let cancelled = false;
        let gsapRef: GsapType | null = null;
        const onMove = (e: MouseEvent) => {
            if (!gsapRef) return;
            const r = el.getBoundingClientRect();
            const dx = ((e.clientX - r.left) / r.width - 0.5) * strength;
            const dy = ((e.clientY - r.top) / r.height - 0.5) * strength;
            gsapRef.to(el, { x: dx, y: dy, duration: 0.35, ease: "power3.out" });
        };
        const onLeave = () => {
            if (!gsapRef) return;
            gsapRef.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
        };
        // Only attach listeners once gsap is in hand — avoids "first hover
        // is a no-op" by waiting for the module before binding.
        loadGsap().then(({ gsap }) => {
            if (cancelled) return;
            gsapRef = gsap;
            el.addEventListener("mousemove", onMove);
            el.addEventListener("mouseleave", onLeave);
        });
        return () => {
            cancelled = true;
            el.removeEventListener("mousemove", onMove);
            el.removeEventListener("mouseleave", onLeave);
        };
    }, [strength]);
    return (
        <div ref={ref} className={className} style={{ display: "inline-block" }}>
            {children}
        </div>
    );
}

/* ───────────────── PageTransition ─────────────────
   Mounts a soft chat-bubble pop on every page.  Used by layout.tsx so
   route changes feel snappy.
*/
const PageCtx = createContext<{ ready: boolean }>({ ready: false });
export function usePageMotion() { return useContext(PageCtx); }

export function PageMount({ children }: { children: ReactNode }) {
    const ref = useGsap((_ctx, el) => {
        void loadGsap().then(({ gsap }) => {
            gsap.fromTo(
                el,
                { opacity: 0, y: 12 },
                { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" },
            );
        });
    }, []);
    return (
        <PageCtx.Provider value={{ ready: true }}>
            <div ref={ref}>{children}</div>
        </PageCtx.Provider>
    );
}
