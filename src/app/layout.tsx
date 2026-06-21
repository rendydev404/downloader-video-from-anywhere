import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import SeoContent from "@/components/SeoContent";
import "./globals.css";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://reload-downloader.vercel.app";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RELOAD - Download Video TikTok Tanpa Watermark, Instagram, Facebook Gratis",
    template: "%s | RELOAD",
  },
  description:
    "RELOAD adalah downloader video tanpa watermark (tanpa WM) gratis untuk TikTok, Instagram, Facebook, YouTube, Twitter/X, dan platform lainnya. Cepat, tanpa iklan, kualitas asli HD.",
  keywords: [
    "download video tiktok tanpa wm",
    "download video tiktok tanpa watermark",
    "downloader video tanpa wm",
    "download video tiktok",
    "tiktok downloader no watermark",
    "download video instagram",
    "download video facebook",
    "download video youtube",
  ],
  icons: {
    icon: "/favicon.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    siteName: "RELOAD",
    title: "RELOAD - Download Video TikTok Tanpa Watermark, Instagram, Facebook Gratis",
    description:
      "Download video tanpa watermark dari TikTok, Instagram, Facebook, YouTube, dan platform lain. Gratis, cepat, kualitas HD asli.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RELOAD - Download Video TikTok Tanpa Watermark",
    description:
      "Downloader video tanpa WM untuk TikTok, Instagram, Facebook, YouTube. Gratis dan cepat.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#05050a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "RELOAD",
              url: SITE_URL,
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Any",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              description:
                "Downloader video tanpa watermark gratis untuk TikTok, Instagram, Facebook, YouTube, dan platform lainnya.",
            }),
          }}
        />
        {children}
        <SeoContent />
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
