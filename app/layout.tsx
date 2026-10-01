import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HRaniti — Build Your Verified Professional Profile",
  description: "Helping professionals build careers, not just find jobs.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16213E",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="font-body antialiased"
      >
        {children}
      </body>
    </html>
  );
}
