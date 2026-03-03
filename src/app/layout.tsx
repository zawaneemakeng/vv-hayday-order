import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "สั่งซื้อสินค้า",
  description: "ระบบสั่งซื้อสินค้า HayDay",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="bg-[#f5f0e8] min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}