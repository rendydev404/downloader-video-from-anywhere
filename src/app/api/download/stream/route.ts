import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

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
  let customHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };
  
  try {
    customHeaders['Referer'] = new URL(directUrl).origin;
  } catch (e) {
    // Ignore invalid directUrl for referer setup
  }

  let ext = searchParams.get('ext');
  if (!ext) ext = isAudio ? '.mp3' : '.mp4';
  if (!ext.startsWith('.')) ext = '.' + ext;
  
  const safeFilename = sanitizeFilename(titleParam) + ext;
  const asciiFilename = safeFilename.replace(/[^\x00-\x7F]/g, '') || `RELOAD_Media${ext}`;

  const headers = new Headers();
  headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  try {
    const response = await fetch(directUrl, {
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
