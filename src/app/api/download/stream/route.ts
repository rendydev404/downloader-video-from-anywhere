import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import ffmpegPath from 'ffmpeg-static';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const directUrl = searchParams.get('directUrl');
  const titleParam = searchParams.get('title') || 'video';
  const typeParam = searchParams.get('type') || 'video';

  if (!directUrl) {
    return new Response(JSON.stringify({ error: 'Direct URL tidak ditemukan.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isAudio = typeParam === 'audio';
  const customHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };

  try {
    customHeaders['Referer'] = new URL(directUrl).origin;
  } catch {
    // Ignore invalid directUrl for referer setup
  }

  const headers = new Headers();
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  let upstream: Response;
  try {
    upstream = await fetch(directUrl, { headers: customHeaders });
    if (!upstream.ok || !upstream.body) {
      throw new Error(`Upstream HTTP ${upstream.status}`);
    }
  } catch (error: any) {
    console.error('Fetch stream error:', error.message);
    return new Response(JSON.stringify({ error: 'Gagal mengambil sumber video.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // AUDIO: always transcode through ffmpeg so the output is guaranteed real MP3,
  // regardless of whether the source was already audio-only or full video.
  if (isAudio) {
    const safeFilename = sanitizeFilename(titleParam) + '.mp3';
    const asciiFilename = safeFilename.replace(/[^\x00-\x7F]/g, '') || 'RELOAD_Audio.mp3';
    headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
    headers.set('Content-Type', 'audio/mpeg');

    if (!ffmpegPath) {
      return new Response(JSON.stringify({ error: 'Konverter audio tidak tersedia di server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ffmpeg = spawn(ffmpegPath as string, [
      '-i', 'pipe:0',
      '-vn',
      '-acodec', 'libmp3lame',
      '-ab', '192k',
      '-f', 'mp3',
      'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    ffmpeg.stderr.on('data', () => { /* ffmpeg logs progress to stderr; ignore */ });
    ffmpeg.on('error', (e) => console.error('ffmpeg spawn error:', e.message));

    const sourceNode = Readable.fromWeb(upstream.body as any);
    sourceNode.pipe(ffmpeg.stdin).on('error', () => { /* source ended/aborted */ });

    const outWeb = Readable.toWeb(ffmpeg.stdout) as unknown as ReadableStream;

    return new Response(outWeb, { status: 200, headers });
  }

  // VIDEO / IMAGE: pass through as before.
  let ext = searchParams.get('ext');
  if (!ext) ext = '.mp4';
  if (!ext.startsWith('.')) ext = '.' + ext;

  const safeFilename = sanitizeFilename(titleParam) + ext;
  const asciiFilename = safeFilename.replace(/[^\x00-\x7F]/g, '') || `RELOAD_Media${ext}`;
  headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);

  let contentType = 'video/mp4';
  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  headers.set('Content-Type', contentType);

  const contentLength = upstream.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);

  return new Response(upstream.body, { status: 200, headers });
}
