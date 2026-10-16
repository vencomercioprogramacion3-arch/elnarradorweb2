import type { NextConfig } from "next";
import { LEGACY_WP_ORIGIN } from "./src/lib/legacy-media";

const nextConfig: NextConfig = {
  // Enlaces viejos a archivos del WordPress (imágenes en notas, PDFs) siguen en Neubox
  async redirects() {
    return [
      { source: "/wp-content/:path*", destination: `${LEGACY_WP_ORIGIN}/wp-content/:path*`, permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "elnarradordemexico.com" },
      { protocol: "https", hostname: "*.elnarradordemexico.com" },
      { protocol: "https", hostname: "fewwvcrfhdgnpfjyadev.supabase.co" },
      { protocol: "https", hostname: "secure.gravatar.com" },
      { protocol: "https", hostname: "i0.wp.com" },
      { protocol: "https", hostname: "i1.wp.com" },
      { protocol: "https", hostname: "i2.wp.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;