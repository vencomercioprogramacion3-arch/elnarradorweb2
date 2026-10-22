import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/newsreader";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { WebsiteJsonLd } from "@/components/seo/JsonLd";
import AdSenseScript from "@/components/ads/AdSenseScript";
import SwgScript from "@/components/ads/SwgScript";
import { ADSENSE_CLIENT_ID } from "@/lib/ads/config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://elnarradordemexico.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "El Narrador de México - Noticias",
    template: "%s | El Narrador de México",
  },
  description:
    "Portal de noticias de México. Cobertura en política, economía, cultura, deportes, ciencia, tecnología y más.",
  keywords: [
    "noticias México",
    "noticias",
    "política México",
    "economía",
    "cultura",
    "deportes",
    "ciencia",
    "tecnología",
    "El Narrador de México",
    "periodismo",
  ],
  authors: [{ name: "El Narrador de México" }],
  creator: "El Narrador de México",
  publisher: "El Narrador de México",
  formatDetection: {
    email: false,
    telephone: false,
  },
  openGraph: {
    title: "El Narrador de México",
    description: "Tu fuente de noticias confiable de México. Cobertura en política, economía, cultura, deportes, ciencia y tecnología.",
    type: "website",
    locale: "es_MX",
    siteName: "El Narrador de México",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "El Narrador de México",
    description: "Tu fuente de noticias confiable de México",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  other: {
    // Verificación de la cuenta de Google AdSense
    "google-adsense-account": ADSENSE_CLIENT_ID,
  },
  verification: {
    // Add your Google Search Console verification code here
    // google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Preload LCP image for faster rendering */}
        <link
          rel="preload"
          href="/images/banner-narrador.jpg"
          as="image"
          fetchPriority="high"
        />
        {/* Preconnect to Supabase storage: older images and PDFs are still hosted there */}
        <link rel="preconnect" href="https://fewwvcrfhdgnpfjyadev.supabase.co" />
        <link rel="dns-prefetch" href="https://fewwvcrfhdgnpfjyadev.supabase.co" />
        {/* Preconnect to WordPress CDN for migrated images */}
        <link rel="preconnect" href="https://i0.wp.com" />
        <link rel="dns-prefetch" href="https://i0.wp.com" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <WebsiteJsonLd />
        <AdminLayoutGuard>
          {children}
        </AdminLayoutGuard>
      </body>
    </html>
  );
}

// Logic to keep the main Website UI separate from the Admin Panel UI
async function AdminLayoutGuard({ children }: { children: React.ReactNode }) {
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const currentPath = headersList.get("x-invoke-path") || "";

  if (currentPath.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <>
      <AdSenseScript />
      <SwgScript />
      <Navbar />
      <main className="min-h-screen pt-[120px]">{children}</main>
      <Footer />
    </>
  );
}
