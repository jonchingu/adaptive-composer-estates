import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shapeshift · 租樓搜尋",
  description:
    "Midland-style renter search composer: distance, location tree, ranking with reasons, and HK rent calculators — morphing cards as you type.",
  // Absolute URLs for the Open Graph image: explicit site URL, else Vercel's production domain.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  openGraph: {
    title: "Shapeshift · 租樓搜尋",
    description: "距離、地區樹、排序理由與租金計算。",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Shapeshift · 租樓搜尋", description: "距離、地區樹、排序理由與租金計算。" },
};

// viewport-fit=cover lets fixed chrome (HUD, toasts) pad itself away from the home indicator.
export const viewport: Viewport = { themeColor: "#3d4a55", colorScheme: "light", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#2a333b] font-sans text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
