import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon gerado (não é arquivo estático) pra bater com o monograma de
// components/logo.tsx sem precisar de um asset de imagem separado.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "#1c1917",
          color: "#d4af6a",
          fontSize: 15,
          fontFamily: "serif",
        }}
      >
        SA
      </div>
    ),
    { ...size },
  );
}
