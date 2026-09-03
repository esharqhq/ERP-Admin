import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { QueryProvider } from "@/providers/query-provider";
import { OfflineOverlay } from "@/components/system/offline-overlay";
import "../globals.css";
import React from "react";

/**
 * Geist for everything, Geist Mono for data — the DS puts every numeral, ID,
 * timestamp and money value in the mono face, which is why the second family is
 * loaded rather than left to a system fallback.
 *
 * Both are exposed as CSS variables instead of the `className` shortcut: two
 * families cannot both own `body`'s class, and `globals.css` builds `font-sans`
 * and `font-mono` on top of these names. The variables are named `--font-geist-*`
 * so they never collide with Tailwind's own `--font-sans` / `--font-mono` theme
 * keys — pointing `--font-sans` at itself is what left `font-mono` dangling
 * before.
 */
const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Uyer Admin",
  description: "Uyer Admin Console",
  icons: {
    icon: "/favicon.png",
  },
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            {children}
            {/* Mounted once, above everything: the network can drop on any
                screen, so this cannot live in a single page. */}
            <OfflineOverlay />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
