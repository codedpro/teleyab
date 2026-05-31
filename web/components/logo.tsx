// Brand mark — TeleYab. The Telegram paper-plane silhouette resolved into
// a small phone/handset glyph in the lower-right, reading as "send a
// username, get a number back". Fully solid — no gradients, no rings.
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
    return (
        <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            className={className}
            aria-hidden="true"
        >
            {/* paper-plane body */}
            <path
                d="M5 14.4 L26 6.5 L21 25.5 L16 18.6 L23 11.5 L11 16.5 Z"
                fill="#229ED9"
            />
            {/* the lower fold of the plane (slightly darker for depth) */}
            <path
                d="M16 18.6 L13 24 L11 16.5 Z"
                fill="#1A8CD8"
            />
        </svg>
    );
}
