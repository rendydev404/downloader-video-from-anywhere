import { NextRequest } from 'next/server';
import { create as createYoutubeDl } from 'youtube-dl-exec';
import ffmpegPath from 'ffmpeg-static';
import { Readable } from 'stream';
import path from 'path';

// Resolve the yt-dlp binary path relative to process.cwd() (the deployed
// function/project root on both `next dev` and Vercel) rather than
// `__dirname` or `require.resolve`, which bundlers (webpack/turbopack)
// rewrite incorrectly for server route handlers.
const ytDlpBinaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', ytDlpBinaryName);
const youtubeDl = createYoutubeDl(ytDlpPath);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sanitizeFilename(name: string): string {
  const clean = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 180);
  return `RELOAD_${clean}`;
}

const ALLOWED_HEIGHTS = new Set([360, 720, 1080]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const titleParam = searchParams.get('title') || 'video';
  const heightParam = parseInt(searchParams.get('height') || '720', 10);

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL tidak ditemukan.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const height = ALLOWED_HEIGHTS.has(heightParam) ? heightParam : 720;

  const safeFilename = sanitizeFilename(titleParam) + '.mp4';
  const asciiFilename = safeFilename.replace(/[^\x00-\x7F]/g, '') || 'RELOAD_Video.mp4';
  const headers = new Headers();
  headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
  headers.set('Content-Type', 'video/mp4');
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  try {
    const subprocess = youtubeDl.exec(
      url,
      {
        // Constrained to H.264 (avc1) video: the merged output streams to
        // stdout as MPEG-TS, which only reliably carries H.264 — vp9/av1
        // get muxed as unrecognized "private data" and produce a file with
        // no playable video track.
        format: `bestvideo[height<=${height}][vcodec^=avc1]+bestaudio[ext=m4a]/best[height<=${height}][vcodec^=avc1]/best[height<=${height}]`,
        mergeOutputFormat: 'mp4',
        ffmpegLocation: ffmpegPath as string,
        output: '-',
        noPlaylist: true,
      },
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    subprocess.stderr?.on('data', () => { /* yt-dlp logs progress to stderr; ignore */ });
    subprocess.on('error', (e) => console.error('yt-dlp spawn error:', e.message));

    if (!subprocess.stdout) {
      throw new Error('yt-dlp produced no output stream');
    }

    const outWeb = Readable.toWeb(subprocess.stdout) as unknown as ReadableStream;
    return new Response(outWeb, { status: 200, headers });
  } catch (error: any) {
    console.error('YouTube stream error:', error.message);
    return new Response(JSON.stringify({ error: 'Gagal memproses video YouTube pada resolusi ini.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
