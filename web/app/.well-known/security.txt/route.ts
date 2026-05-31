// security.txt — RFC 9116 disclosure contact.

export const dynamic = "force-static";
export const revalidate = 86400;

export function GET(): Response {
    const body = `Contact: mailto:security@teleyab.ir
Expires: 2027-12-31T23:59:59.000Z
Preferred-Languages: fa, en
Canonical: https://teleyab.ir/.well-known/security.txt
Acknowledgments:
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
