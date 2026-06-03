import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from 'react-hot-toast';


export const metadata: Metadata = {
  title: "SCMP Vincons",
  description: "Hệ thống quản lý công nhân và thẻ ra vào",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SCMP Vincons",
  },
  icons: {
    icon: "/vincons_logo.png",
    apple: "/vincons_logo.png",
  },
  themeColor: "#1e3a8a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans">
      <body className="antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
