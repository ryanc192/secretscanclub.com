import "./styles/scan.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import QrPageViewTracker from "./components/QrPageViewTracker";

export const metadata: Metadata = {
  title: "Secret Scan Club",
  description: "Daily drops, one QR, always new.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      style={{
        backgroundColor: "#07111f", // prevents white flash
      }}
    >
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          fontFamily: "Arial, sans-serif",
          background:
            "radial-gradient(circle at top, #111a33 0%, #07111f 45%, #030816 100%)",
          color: "#ffffff",
          overflowX: "hidden",
        }}
      >
        <QrPageViewTracker />
        {children}
      </body>
    </html>
  );
}
