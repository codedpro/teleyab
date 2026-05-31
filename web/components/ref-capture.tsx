"use client";

import { useEffect } from "react";

const STORAGE_KEY = "teleyab_ref";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type Stored = { value: string; expiresAt: number };

/**
 * Mounted once at the root layout level.  Detects a `?ref=<code>` query
 * parameter on any page load, persists it to localStorage with a 30-day
 * expiry, then strips the parameter from the URL so visitors don't see
 * an ugly tracking suffix when they navigate.  /login reads the stored
 * value as a fallback when no `ref` is in its own URL.
 */
export default function RefCapture() {
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            const raw = url.searchParams.get("ref");
            if (raw) {
                const code = raw.trim().slice(0, 64);
                if (code && /^[A-Za-z0-9_-]+$/.test(code)) {
                    const stored: Stored = { value: code, expiresAt: Date.now() + TTL_MS };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
                }
                url.searchParams.delete("ref");
                const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "") + url.hash;
                window.history.replaceState({}, "", next);
            }
        } catch {
            // Storage / URL APIs unavailable — silently ignore.
        }
    }, []);
    return null;
}

/** Read the stored ref code if present and not expired.  Used by /login. */
export function readStoredRef(): string {
    if (typeof window === "undefined") return "";
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return "";
        const stored = JSON.parse(raw) as Stored;
        if (!stored.value || typeof stored.expiresAt !== "number") return "";
        if (Date.now() > stored.expiresAt) {
            localStorage.removeItem(STORAGE_KEY);
            return "";
        }
        return stored.value;
    } catch {
        return "";
    }
}

/** Clear the stored ref code after the registration form submits successfully. */
export function clearStoredRef(): void {
    if (typeof window === "undefined") return;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

/* ─── ?next= preservation across register → email-verify → login ───
 * Email verification breaks the SPA session: the user clicks a link from
 * their inbox, which may even open in a different tab.  The ?next= the
 * visitor came in with (e.g. /topup?amount=8000000) would otherwise be
 * lost.  We stash it in localStorage when register submits, then the
 * verify page and the "ورود به حساب" success-screen button read it back
 * and re-attach it to /login?next=...
 *
 * Trade-off: cross-device click on the email link still loses the next,
 * but that's an acceptable edge case.  Same-device, same-browser is the
 * 99% path and that's what this fixes.
 */
const NEXT_STORAGE_KEY = "teleyab_next";
const NEXT_TTL_MS = 60 * 60 * 1000; // 1 hour — matches reset token TTL.

type StoredNext = { value: string; expiresAt: number };

/** Persist a same-site path so the verify/login pages can recover it. */
export function storeNext(path: string): void {
    if (typeof window === "undefined") return;
    if (!path.startsWith("/") || path.startsWith("//")) return;
    if (path === "/lookup") return; // default — no need to persist
    try {
        const stored: StoredNext = { value: path, expiresAt: Date.now() + NEXT_TTL_MS };
        localStorage.setItem(NEXT_STORAGE_KEY, JSON.stringify(stored));
    } catch { /* noop */ }
}

/** Read the stored next path if present + not expired. */
export function readStoredNext(): string {
    if (typeof window === "undefined") return "";
    try {
        const raw = localStorage.getItem(NEXT_STORAGE_KEY);
        if (!raw) return "";
        const stored = JSON.parse(raw) as StoredNext;
        if (!stored.value || typeof stored.expiresAt !== "number") return "";
        if (Date.now() > stored.expiresAt) {
            localStorage.removeItem(NEXT_STORAGE_KEY);
            return "";
        }
        if (!stored.value.startsWith("/") || stored.value.startsWith("//")) return "";
        return stored.value;
    } catch { return ""; }
}

/** Drop the stored next after login lands the user. */
export function clearStoredNext(): void {
    if (typeof window === "undefined") return;
    try { localStorage.removeItem(NEXT_STORAGE_KEY); } catch { /* noop */ }
}
