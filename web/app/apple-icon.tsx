import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    background: "#229ED9",
                    color: "#ffffff",
                    fontSize: 128,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "system-ui, sans-serif",
                }}
            >
                T
            </div>
        ),
        { ...size },
    );
}
