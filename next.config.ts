import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase server response timeout for large video downloads
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // Allow thumbnail images from any domain
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
