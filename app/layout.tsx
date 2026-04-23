import "./styles/scan.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import QrPageViewTracker from "./components/QrPageViewTracker";
import GoogleAnalytics from "./components/GoogleAnalytics";
import GoogleAdSense from "./components/GoogleAdSense";

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
        backgroundColor: "#000000", // 🔥 solid black
      }}
    >
      <head>
  <GoogleAnalytics />
  <GoogleAdSense />
</head>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#000000", // 🔥 match exactly
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
