import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase server response timeout for large video downloads
  // Keep these as real Node modules (not bundled) so their binary
  // assets (yt-dlp, ffmpeg) resolve correctly and get traced for Vercel.
  serverExternalPackages: ['youtube-dl-exec', 'ffmpeg-static', '@google-analytics/data', 'google-gax', 'google-auth-library'],
  // Vercel's serverless file tracer only follows require()/fs calls it can
  // statically see; the yt-dlp/ffmpeg binaries are resolved via dynamic
  // path.join() calls, so they must be force-included explicitly.
  outputFileTracingIncludes: {
    'src/app/api/download/youtube-stream/route.ts': [
      'node_modules/youtube-dl-exec/bin/**',
      'node_modules/ffmpeg-static/ffmpeg',
    ],
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
