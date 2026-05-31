import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    background: "#229ED9",
                    color: "#ffffff",
                    fontSize: 22,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    fontFamily: "system-ui, sans-serif",
                }}
            >
                T
            </div>
        ),
        { ...size },
    );
}
