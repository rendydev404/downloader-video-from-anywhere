import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    // Handle protocol-relative URLs
    const finalUrl = url.startsWith('//') ? `https:${url}` : url;

    let referer = '';
    if (finalUrl.includes('tiktokcdn.com')) referer = 'https://www.tiktok.com/';
    else if (finalUrl.includes('fbcdn.net')) referer = 'https://www.facebook.com/';
    else if (finalUrl.includes('twimg.com')) referer = 'https://twitter.com/';
    else if (finalUrl.includes('instagram.com')) referer = 'https://www.instagram.com/';
    else referer = new URL(finalUrl).origin;

    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
    };
    if (referer) {
      fetchHeaders['Referer'] = referer;
    }

    const response = await fetch(finalUrl, {
      headers: fetchHeaders,
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Proxy image error:', error);
    return new NextResponse('Failed to proxy image', { status: 500 });
  }
}
