import "./styles/scan.css";
export const metadata = {
  title: "Secret Scan Club",
  description: "Daily drops, one QR, always new."
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
