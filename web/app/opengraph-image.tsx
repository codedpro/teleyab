import { ImageResponse } from "next/og";

export const alt = "TeleYab — یوزرنیمِ تلگرام به شمارهٔ موبایل";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    background: "linear-gradient(135deg, #0c0d10 0%, #1a2b3a 100%)",
                    color: "#ffffff",
                    padding: 80,
                    fontFamily: "system-ui, sans-serif",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 20,
                        marginBottom: 40,
                    }}
                >
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 20,
                            background: "#229ED9",
                            color: "#fff",
                            fontSize: 56,
                            fontWeight: 900,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        T
                    </div>
                    <div style={{ fontSize: 56, fontWeight: 800 }}>TeleYab</div>
                </div>

                <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.15, maxWidth: 1000 }}>
                    Telegram username → phone
                </div>

                <div
                    style={{
                        fontSize: 36,
                        marginTop: 28,
                        color: "#229ED9",
                        fontWeight: 700,
                    }}
                >
                    Pay only when we find it.
                </div>

                <div
                    style={{
                        position: "absolute",
                        bottom: 60,
                        left: 80,
                        right: 80,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 24,
                        color: "#a0aec0",
                    }}
                >
                    <span>80–85% success rate</span>
                    <span>teleyab.ir</span>
                </div>
            </div>
        ),
        { ...size },
    );
}
