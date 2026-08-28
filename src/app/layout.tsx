import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnthroFace — Clinical-Grade Facial Anthropometry",
  description:
    "Calibrate 50 ISO anthropometric landmarks on a frontal portrait with MediaPipe FaceMesh, then export a hover-interactive proportion report (PNG / CSV / JSON). Runs 100% in-browser.",
  keywords: [
    "AnthroFace",
    "facial anthropometry",
    "MediaPipe",
    "FaceMesh",
    "facial proportions",
    "neoclassical canons",
    "golden ratio",
    "canthal tilt",
    "nasolabial angle",
    "ISO 7250",
  ],
  authors: [{ name: "AnthroFace" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "AnthroFace — Clinical-Grade Facial Anthropometry",
    description:
      "Calibrate 50 ISO anthropometric landmarks, get a hover-interactive proportion report.",
    url: "https://chat.z.ai",
    siteName: "AnthroFace",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AnthroFace",
    description: "Clinical-grade facial anthropometry, in your browser.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
