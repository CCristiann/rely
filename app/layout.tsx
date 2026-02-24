import type { Metadata } from "next";
import { Geist, Geist_Mono, EB_Garamond, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "RelyRAG — RAG as a Service", template: "%s | RelyRAG" },
  description:
    "Upload documents, create knowledge bases, and chat with your data using Gemini AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", inter.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
