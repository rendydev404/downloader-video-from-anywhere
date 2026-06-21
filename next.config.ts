import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase server response timeout for large video downloads
  // Keep these as real Node modules (not bundled) so their binary
  // assets (yt-dlp, ffmpeg) resolve correctly and get traced for Vercel.
  serverExternalPackages: ['ffmpeg-static', '@google-analytics/data', 'google-gax', 'google-auth-library'],
  // Vercel's serverless file tracer only follows require()/fs calls it can
  // statically see; the ffmpeg binary (used to transcode audio to real MP3)
  // is resolved at runtime, so it must be force-included explicitly.
  outputFileTracingIncludes: {
    'src/app/api/download/stream/route.ts': [
      'node_modules/ffmpeg-static/ffmpeg',
    ],
  },
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
