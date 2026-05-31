// humans.txt — humanstxt.org convention.

export const dynamic = "force-static";
export const revalidate = 86400;

export function GET(): Response {
    const body = `/* TEAM */
Team: TeleYab
Site: https://teleyab.ir
Language: fa-IR (RTL)
Contact: via the registered account email

/* THANKS */
To every user who reports a bug, sends an idea, or tells a friend.

/* SITE */
Last update: 2026-05-19
Standards: HTML5, CSS3, ES2024, WCAG 2.2 AA where applicable
Components: Next.js 16 (App Router, RSC), React 19, Tailwind CSS v4, GSAP
Backend: Go 1.23 with chi and pgx
Database: PostgreSQL 16
Auth: email + password (bcrypt), session cookies
Payments: card-to-card top-up, wallet-based billing in Iranian Toman
Hosting: deployed in Iran behind CDN
Direction: right-to-left, RTL-first

/* LICENSE */
Content (c) TeleYab. All rights reserved.
`;

    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
            "X-Robots-Tag": "index, follow",
        },
    });
}
