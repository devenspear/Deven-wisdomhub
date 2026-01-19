import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { Libre_Baskerville } from "next/font/google";

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Wisdom Hub",
  description: "A curated collection of 133 quotes gathered over 20 years from books, interviews, and diverse sources. Discover insights on wisdom, philosophy, and personal growth.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  keywords: ["quotes", "wisdom", "philosophy", "inspiration", "personal growth", "knowledge", "insights"],
  authors: [{ name: "Deven" }],
  creator: "Deven",
  publisher: "Deven",

  // Open Graph metadata for social sharing
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nlight10.me",
    title: "My Wisdom Hub",
    description: "A curated collection of 133 quotes gathered over 20 years. Discover insights on wisdom, philosophy, and personal growth.",
    siteName: "My Wisdom Hub",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "My Wisdom Hub Logo",
      },
    ],
  },

  // Twitter Card metadata
  twitter: {
    card: "summary",
    title: "My Wisdom Hub",
    description: "A curated collection of 133 quotes gathered over 20 years.",
    images: ["/og-image.png"],
  },

  // Icons
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },

  // Additional metadata
  robots: {
    index: true,
    follow: true,
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
        className={`${geistSans.variable} ${geistMono.variable} ${libreBaskerville.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
