import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function appIcon(size: number) {
  const image = await readFile(path.join(process.cwd(), "public/brand/detective-icon.png"));
  return new ImageResponse(
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#121B22" }}>
      {/* ImageResponse renders a source image into the app-icon canvas. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${image.toString("base64")}`} alt="" width={size * 0.94} height={size * 0.94} />
    </div>,
    { width: size, height: size },
  );
}
