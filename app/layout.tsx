import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VLR Compare",
  description: "Interactive Valorant player comparison dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
