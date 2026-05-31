// Editorial primitives — small composable building blocks that give every
// page the same magazine-spread typography. Use these instead of
// shadcn Cards everywhere.

import * as React from "react";
import { cn } from "@/lib/cn";

/* ───────────────────────────── chrome ───────────────────────────── */

/** Small mono uppercase tracker (column markers, dates, byline chrome).
 *  Always LTR — these strings are English chrome ("VOL.01 · NO.001"). */
export function Tracker({
    children,
    className,
    as: Tag = "span",
}: {
    children: React.ReactNode;
    className?: string;
    as?: React.ElementType;
}) {
    return (
        <Tag dir="ltr" className={cn("tracker", className)}>
            {children}
        </Tag>
    );
}

/** Numbered foot index marker, like [01]. */
export function FootIndex({
    n,
    className,
}: {
    n: number;
    className?: string;
}) {
    return (
        <span dir="ltr" className={cn("foot-index", className)}>
            [{String(n).padStart(2, "0")}]
        </span>
    );
}

/* ───────────────────────────── rules ───────────────────────────── */

export function Rule({
    weight = "normal",
    className,
}: {
    weight?: "soft" | "normal" | "strong";
    className?: string;
}) {
    const map = { soft: "rule-soft", normal: "rule", strong: "rule-strong" } as const;
    return <hr className={cn("border-t", map[weight], className)} />;
}

/* ───────────────────────────── headings ───────────────────────────── */

/** Big RTL editorial display heading. */
export function Display({
    children,
    className,
    as: Tag = "h1",
}: {
    children: React.ReactNode;
    className?: string;
    as?: React.ElementType;
}) {
    return (
        <Tag className={cn("display-fa text-balance text-bone", className)}>{children}</Tag>
    );
}

/** Latin display (Instrument Serif italic) — used for English fragments
 *  inside RTL headings. Always LTR-isolated so neighboring RTL
 *  punctuation doesn't pull the run rightward. */
export function Latin({
    children,
    className,
    color = "persimmon",
}: {
    children: React.ReactNode;
    className?: string;
    color?: "persimmon" | "bone" | "saffron" | "teal-soft";
}) {
    const colorMap = {
        persimmon: "text-persimmon",
        bone: "text-bone",
        saffron: "text-saffron",
        "teal-soft": "text-teal-soft",
    } as const;
    return (
        <span
            dir="ltr"
            className={cn("display-en", colorMap[color], className)}
            style={{ unicodeBidi: "isolate" }}
        >
            {children}
        </span>
    );
}

/* ───────────────────────────── numerals ───────────────────────────── */

/** Big editorial numeral (balance, key counts, etc.). */
export function Numeral({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <span className={cn("numeral", className)}>{children}</span>;
}

/* ───────────────────────────── section header ───────────────────────────── */

/** Section header with [n] foot index + tracker label. */
export function SectionHeader({
    index,
    label,
    title,
    titleEn,
    note,
    className,
}: {
    index: number;
    label: string;
    title: string;
    titleEn?: string;
    note?: string;
    className?: string;
}) {
    return (
        <div className={cn("mb-6", className)}>
            <div className="flex items-baseline gap-3 border-b rule-soft pb-2">
                <FootIndex n={index} />
                <Tracker className="text-bone-dim">{label}</Tracker>
                {note && <Tracker className="ms-auto text-whisper">{note}</Tracker>}
            </div>
            <h2 className="display-fa mt-4 text-3xl text-bone md:text-4xl">
                {title}
                {titleEn && (
                    <span dir="ltr" className="display-en ms-3 text-bone-dim inline-block">
                        — {titleEn}
                    </span>
                )}
            </h2>
        </div>
    );
}

/* ───────────────────────────── ribbon ─────────────────────────────  */

/** Persimmon ribbon used as live-status / breaking-news strip. */
export function Ribbon({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 border-y border-persimmon/40 bg-persimmon/5 px-3 py-1.5 tracker text-persimmon",
                className
            )}
        >
            <span className="dot-live" />
            {children}
        </div>
    );
}

/* ───────────────────────────── inline byline ───────────────────────────── */

export function Byline({ from, lines }: { from: string; lines: string[] }) {
    return (
        <div className="border-r border-persimmon ps-4 pe-4 ms-2 my-6 max-w-md">
            <Tracker className="mb-2 text-persimmon">{from}</Tracker>
            {lines.map((l, i) => (
                <p key={i} className="display-fa text-xl leading-snug text-bone">
                    {l}
                </p>
            ))}
        </div>
    );
}
