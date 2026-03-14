import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Abhay Pratap Singh — Senior Backend Engineer & Team Lead";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const faviconBase64 =
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzNCODJGNiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM4QjVDRjYiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8Y2xpcFBhdGggaWQ9ImNpcmNsZSI+CiAgICAgIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMjU2Ii8+CiAgICA8L2NsaXBQYXRoPgogIDwvZGVmcz4KICA8Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjI1NiIgZmlsbD0idXJsKCNiZykiLz4KICA8ZyBjbGlwLXBhdGg9InVybCgjY2lyY2xlKSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNTgsIDU2KSBzY2FsZSgxLjApIj4KICAgIDxwYXRoIGQ9Ik0gMTE5LjYyIDI2Ny4xOSBDMTE5LjM0LDI2Ni43NCAxMjYuNDgsMjUyLjY4IDEzNS40OCwyMzUuOTQgTCAxNTEuODUgMjA1LjUwIEwgMjEyLjE3IDIwNS4wMCBMIDI3Mi41MCAyMDQuNTAgTCAyNzguMDQgMjAxLjc4IEMyODcuMTYsMTk3LjMwIDI5MS4wMCwxODkuNzUgMjkxLjAwLDE3Ni4yOCBDMjkxLjAwLDE2My43NyAyODYuNDAsMTU2Ljg3IDI3NS43MCwxNTMuMzIgQzI3MS4zMywxNTEuODggMjY0LjkzLDE1MS41MSAyMzUuNTAsMTUxLjA1IEwgMjAwLjUwIDE1MC41MCBMIDE5NS4yMSAxNDAuMjUgTCAxODkuOTMgMTMwLjAwIEwgMjI4LjMzIDEzMC4wMCBDMjcwLjM0LDEzMC4wMCAyNzguNDUsMTMwLjc0IDI5MC4zNywxMzUuNjMgQzI5My44OCwxMzcuMDcgMjk4Ljg2LDE0MC4wNSAzMDEuNDIsMTQyLjI0IEMzMTIuMTcsMTUxLjQzIDMxNy4xNywxNzAuNTggMzEzLjg4LDE4OS45MiBDMzEwLjkxLDIwNy4zNiAzMDAuNjEsMjE4LjA0IDI4MS4zMywyMjMuNjkgQzI3Ni4yNSwyMjUuMTggMjY4LjI5LDIyNS40NyAyMTkuMTcsMjI1Ljk1IEwgMTYyLjg0IDIyNi41MCBMIDE1Mi40NCAyNDUuODcgQzE0Ni43MiwyNTYuNTMgMTQxLjUzLDI2NS44NyAxNDAuOTAsMjY2LjYyIEMxMzkuNjMsMjY4LjE1IDEyMC41MywyNjguNjYgMTE5LjYyLDI2Ny4xOSBaTSA5NC4wNSAyNDYuMjUgQzExNi4xOCwyMDMuNDkgMTQ0LjQ3LDE0OS4wMSAxNDkuMzUsMTM5LjczIEwgMTU0LjUwIDEyOS45NiBMIDE2Ni44MiAxMzAuMjMgTCAxNzkuMTUgMTMwLjUwIEwgMTgzLjM5IDEzOC41MCBDMTk0LjYxLDE1OS42MiAyMTIuMDAsMTkzLjk0IDIxMi4wMCwxOTQuOTQgQzIxMi4wMCwxOTUuNzIgMjA4LjIxLDE5NS45OCAxOTkuMzksMTk1Ljc4IEwgMTg2Ljc4IDE5NS41MCBMIDE3Ny4xNCAxNzcuNTEgQzE3MS44NCwxNjcuNjIgMTY3LjEzLDE1OS41MiAxNjYuNjksMTU5LjUxIEMxNjYuMjQsMTU5LjUxIDE2NC4yOSwxNjIuNDMgMTYyLjM0LDE2Ni4wMCBDMTUyLjgwLDE4My41NiAxNDIuMDgsMjAzLjQ2IDEzNy41NCwyMTIuMDQgQzEzNC43NywyMTcuMjkgMTI3LjEzLDIzMS41OCAxMjAuNTYsMjQzLjc5IEwgMTA4LjYyIDI2Ni4wMCBMIDk2LjIyIDI2Ni4wMCBMIDgzLjgzIDI2Ni4wMCBMIDk0LjA1IDI0Ni4yNSBaTSAyMTYuNzEgMjUwLjk4IEwgMjA4LjkxIDIzNi4wMCBMIDIyMS4zOCAyMzYuMDAgTCAyMzMuODUgMjM2LjAwIEwgMjQxLjQzIDI1MC4zOSBDMjQ1LjU5LDI1OC4zMSAyNDkuMDAsMjY1LjA2IDI0OS4wMCwyNjUuMzkgQzI0OS4wMCwyNjUuNzMgMjQzLjQ5LDI2NS45OSAyMzYuNzUsMjY1Ljk4IEwgMjI0LjUwIDI2NS45NiBMIDIxNi43MSAyNTAuOTggWiIgZmlsbD0id2hpdGUiLz4KICA8L2c+Cjwvc3ZnPgo=";

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
        <img
          src={`data:image/svg+xml;base64,${faviconBase64}`}
          width={90}
          height={90}
          style={{ marginBottom: "30px" }}
        />
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
