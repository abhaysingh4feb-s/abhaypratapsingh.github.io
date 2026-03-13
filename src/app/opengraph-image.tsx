import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Abhay Pratap Singh — Senior Backend Engineer & Team Lead";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0f1c 0%, #161d35 50%, #1e2742 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            fontSize: "36px",
            fontWeight: 700,
            color: "white",
            marginBottom: "30px",
          }}
        >
          A
        </div>
        <div
          style={{
            fontSize: "52px",
            fontWeight: 800,
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          Abhay Pratap Singh
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#94a3b8",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          Senior Backend Engineer & Team Lead
        </div>
        <div
          style={{
            fontSize: "18px",
            color: "#64748b",
            textAlign: "center",
          }}
        >
          abhaypratapsingh.co.in
        </div>
      </div>
    ),
    { ...size }
  );
}
