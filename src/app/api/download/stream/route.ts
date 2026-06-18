import { NextRequest } from 'next/server';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

function getYtdlpPath(): string | null {
  const exePath = path.join(process.cwd(), 'yt-dlp.exe');
  if (fs.existsSync(exePath)) return exePath;
  return null;
}

function sanitizeFilename(name: string): string {
  const clean = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 180);
  return `RELOAD_${clean}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoUrl = searchParams.get('url');
  const directUrl = searchParams.get('directUrl');
  const source = searchParams.get('source') || 'ytdlp';
  const titleParam = searchParams.get('title') || 'video';
  const typeParam = searchParams.get('type') || 'video';
  const resParam = searchParams.get('res');

  if (!videoUrl && !directUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isAudio = typeParam === 'audio';
  let targetMediaUrl = directUrl;
  let audioTargetUrl: string | null = null;
  let title = titleParam;
  let customHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  };

  // If using yt-dlp, extract direct URL first
  if (!targetMediaUrl || source === 'ytdlp') {
    const ytdlpPath = getYtdlpPath();
    if (!ytdlpPath) {
      return new Response(JSON.stringify({ error: 'yt-dlp not found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const urlToExtract = videoUrl || directUrl!;
      const isYouTube = urlToExtract.includes('youtube.com') || urlToExtract.includes('youtu.be');
      // Gunakan bestaudio hanya untuk YouTube (karena stream-nya mendukung pipe ffmpeg).
      // Untuk platform lain (IG, FB, Twitter), ambil video MP4 utuh lalu ekstrak audionya 
      // untuk mencegah bug audio terpotong (2 detik) karena format DASH fragmented.
      let formatArg = 'best[ext=mp4]/best';
      if (isAudio && isYouTube) {
        formatArg = 'bestaudio';
      } else if (isYouTube && !isAudio && resParam) {
        formatArg = `bestvideo[height<=${resParam}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${resParam}][ext=mp4]/best`;
      }
      
      const { stdout } = await execFileAsync(ytdlpPath, [
        '-J',
        '-f', formatArg,
        '--no-warnings',
        '--no-playlist',
        '--no-check-certificates',
        videoUrl || directUrl!
      ], { timeout: 30000, maxBuffer: 1024 * 1024 * 10 });
      
      const info = JSON.parse(stdout);
      
      let videoTargetUrl = info.url;
      if (!videoTargetUrl && info.requested_formats) {
        // It's a split format
        videoTargetUrl = info.requested_formats.find((f: any) => f.vcodec !== 'none')?.url;
        audioTargetUrl = info.requested_formats.find((f: any) => f.acodec !== 'none')?.url || null;
      }
      
      targetMediaUrl = videoTargetUrl;
      title = info.title || title;
      if (info.http_headers) {
        customHeaders = { ...customHeaders, ...info.http_headers };
      }
    } catch (error: any) {
      console.error('yt-dlp extract error:', error.message);
      return new Response(JSON.stringify({ error: 'Gagal mengekstrak info dari URL video.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else if (targetMediaUrl) {
    customHeaders['Referer'] = new URL(targetMediaUrl).origin;
  }

  if (!targetMediaUrl) {
    return new Response(JSON.stringify({ error: 'Direct URL tidak ditemukan.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let ext = searchParams.get('ext');
  if (!ext) ext = isAudio ? '.mp3' : '.mp4';
  if (!ext.startsWith('.')) ext = '.' + ext;
  
  const safeFilename = sanitizeFilename(title) + ext;
  const asciiFilename = safeFilename.replace(/[^\x00-\x7F]/g, '') || `RELOAD_Media${ext}`;

  const needsFfmpegAudio = isAudio && source === 'ytdlp';
  const needsFfmpegVideoMerge = !isAudio && audioTargetUrl !== null;

  const headers = new Headers();
  headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (needsFfmpegAudio) {
    headers.set('Content-Type', 'audio/mpeg');

    const ffmpegPath = path.join(process.cwd(), 'bin', 'ffmpeg.exe');
    if (!fs.existsSync(ffmpegPath)) {
      return new Response(JSON.stringify({ error: 'FFmpeg tidak ditemukan.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ffmpegProcess = spawn(ffmpegPath, [
      '-headers', Object.entries(customHeaders).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n',
      '-i', targetMediaUrl!,
      '-vn', '-ar', '44100', '-ac', '2', '-b:a', '128k', '-f', 'mp3', 'pipe:1'
    ]);

    const stream = new ReadableStream({
      start(controller) {
        ffmpegProcess.stdout.on('data', chunk => {
          controller.enqueue(new Uint8Array(chunk));
        });
        ffmpegProcess.stdout.on('end', () => {
          controller.close();
        });
        ffmpegProcess.on('error', err => {
          console.error("FFmpeg error:", err);
          controller.error(err);
        });
        ffmpegProcess.on('close', code => {
          if (code !== 0 && code !== null) console.error("FFmpeg exited with code", code);
        });
      },
      cancel() {
        ffmpegProcess.kill('SIGKILL');
      }
    });

    return new Response(stream, {
      status: 200,
      headers,
    });

  } else if (needsFfmpegVideoMerge) {
    headers.set('Content-Type', 'video/mp4');

    const ffmpegPath = path.join(process.cwd(), 'bin', 'ffmpeg.exe');
    if (!fs.existsSync(ffmpegPath)) {
      return new Response(JSON.stringify({ error: 'FFmpeg tidak ditemukan.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headersStr = Object.entries(customHeaders).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n';

    const ffmpegProcess = spawn(ffmpegPath, [
      '-headers', headersStr,
      '-i', targetMediaUrl!,
      '-headers', headersStr,
      '-i', audioTargetUrl!,
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov',
      'pipe:1'
    ]);

    const stream = new ReadableStream({
      start(controller) {
        ffmpegProcess.stdout.on('data', chunk => {
          controller.enqueue(new Uint8Array(chunk));
        });
        ffmpegProcess.stdout.on('end', () => {
          controller.close();
        });
        ffmpegProcess.on('error', err => {
          console.error("FFmpeg mux error:", err);
          controller.error(err);
        });
        ffmpegProcess.on('close', code => {
          if (code !== 0 && code !== null) console.error("FFmpeg mux exited with code", code);
        });
      },
      cancel() {
        ffmpegProcess.kill('SIGKILL');
      }
    });

    return new Response(stream, {
      status: 200,
      headers,
    });

  } else {
    // Direct stream
    try {
      const response = await fetch(targetMediaUrl, {
        headers: customHeaders
      });

      if (!response.ok) {
        throw new Error(`Upstream HTTP ${response.status}`);
      }

      let contentType = isAudio ? 'audio/mpeg' : 'video/mp4';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      
      headers.set('Content-Type', contentType);
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        headers.set('Content-Length', contentLength);
      }

      // @ts-ignore - response.body is ReadableStream
      return new Response(response.body, {
        status: 200,
        headers,
      });

    } catch (error: any) {
      console.error('Fetch stream error:', error.message);
      return new Response(JSON.stringify({ error: 'Gagal mengalirkankan video.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
