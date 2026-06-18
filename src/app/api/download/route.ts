import { NextResponse } from 'next/server';
import axios from 'axios';

function detectPlatform(url: string, extractor?: string): string {
  const u = url.toLowerCase();
  const e = (extractor || '').toLowerCase();
  if (u.includes('tiktok.com') || e.includes('tiktok')) return 'tiktok';
  if (u.includes('youtube.com') || u.includes('youtu.be') || e.includes('youtube')) return 'youtube';
  if (u.includes('instagram.com') || e.includes('instagram')) return 'instagram';
  if (u.includes('facebook.com') || u.includes('fb.watch') || e.includes('facebook')) return 'facebook';
  if (u.includes('twitter.com') || u.includes('x.com') || e.includes('twitter')) return 'twitter';
  if (u.includes('threads.net') || u.includes('threads.com') || e.includes('threads')) return 'threads';
  if (u.includes('reddit.com') || e.includes('reddit')) return 'reddit';
  if (u.includes('vimeo.com') || e.includes('vimeo')) return 'vimeo';
  if (u.includes('twitch.tv') || e.includes('twitch')) return 'twitch';
  if (u.includes('dailymotion.com') || e.includes('dailymotion')) return 'dailymotion';
  if (u.includes('bilibili.com') || e.includes('bilibili')) return 'bilibili';
  return 'other';
}

// TikTok handler using TikWM API (bypasses 403 Forbidden from yt-dlp)
async function handleTikTok(url: string) {
  try {
    const response = await axios.post(
      'https://www.tikwm.com/api/',
      new URLSearchParams({ url, count: '12', cursor: '0', web: '1', hd: '1' }),
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );

    const data = response.data?.data;
    if (data) {
      let videoUrl = data.hdplay || data.play;
      let audioUrl = data.music_info?.play || data.music || '';
      
      if (videoUrl) {
        // TikWM sometimes returns relative URLs
        if (videoUrl.startsWith('/')) {
          videoUrl = 'https://www.tikwm.com' + videoUrl;
        }
        if (audioUrl.startsWith('/')) {
          audioUrl = 'https://www.tikwm.com' + audioUrl;
        }
        let thumbnail = data.cover || data.origin_cover || '';
        if (thumbnail.startsWith('/')) {
          thumbnail = 'https://www.tikwm.com' + thumbnail;
        }
        return {
          success: true,
          title: data.title || 'TikTok Video',
          thumbnail: thumbnail,
          duration: data.duration || 0,
          resolution: '',
          filesize: 0,
          ext: 'mp4',
          platform: 'tiktok',
          uploader: data.author?.nickname || data.author?.unique_id || '',
          directUrl: videoUrl,
          audioUrl: audioUrl,
          source: 'tikwm',
        };
      }
    }
  } catch (e: any) {
    console.error('TikWM API error:', e.message);
  }
  return null;
}

// Instagram handler using public scraper
async function handleInstagram(url: string) {
  // Try multiple Instagram download APIs
  const apis = [
    async () => {
      const response = await axios.post(
        'https://v3.igdownloader.app/api/ajaxSearch',
        new URLSearchParams({ q: url, t: 'media', lang: 'en' }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 15000,
        }
      );
      if (response.data?.data) {
        // Extract video URL from HTML response
        const htmlData = response.data.data;
        const videoMatch = htmlData.match(/href="([^"]+\.mp4[^"]*)"/i) 
          || htmlData.match(/href="(https:\/\/[^"]+)"/i);
        if (videoMatch && videoMatch[1]) {
          return {
            success: true,
            title: 'Instagram Video',
            thumbnail: '',
            duration: 0,
            resolution: '',
            filesize: 0,
            ext: 'mp4',
            platform: 'instagram',
            uploader: '',
            directUrl: videoMatch[1],
            source: 'igdownloader',
          };
        }
      }
      return null;
    },
  ];

  for (const apiFn of apis) {
    try {
      const result = await apiFn();
      if (result) return result;
    } catch (e: any) {
      console.error('IG API error:', e.message);
    }
  }
  return null;
}

// Threads handler using native fetch to parse HTML
async function handleThreads(url: string) {
  try {
    const fixedUrl = url.replace('threads.com', 'threads.net');
    const response = await axios.get(fixedUrl, {
      headers: {
        'User-Agent': 'Instagram 314.0.0.33.109 Android',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000,
    });
    
    const html = response.data;
    
    const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    let title = titleMatch ? titleMatch[1].replace('on Threads', '').trim() : 'Threads Post';

    let videoUrl = null;
    let imageUrl = null;

    if (ogVideoMatch && ogVideoMatch[1]) {
      videoUrl = ogVideoMatch[1].replace(/&amp;/g, '&');
    }
    
    if (ogImageMatch && ogImageMatch[1]) {
      imageUrl = ogImageMatch[1].replace(/&amp;/g, '&');
    }

    if (videoUrl) {
      return {
        success: true,
        title,
        directUrl: videoUrl,
        thumbnail: imageUrl || '',
        ext: 'mp4',
        platform: 'threads',
        source: 'threads_native',
      };
    }

    if (imageUrl) {
      return {
        success: true,
        title,
        directUrl: imageUrl,
        thumbnail: imageUrl,
        ext: 'jpg',
        platform: 'threads',
        source: 'threads_native',
      };
    }

    return null;
  } catch (error: any) {
    console.error('Threads native extraction error:', error.message);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL tidak boleh kosong.' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Format URL tidak valid.' }, { status: 400 });
    }

    const platform = detectPlatform(url);

    // TikTok: Use TikWM API (yt-dlp gets 403 from TikTok)
    if (platform === 'tiktok') {
      const tikTokResult = await handleTikTok(url);
      if (tikTokResult) {
        return NextResponse.json(tikTokResult);
      }
      // If TikWM fails, try yt-dlp with cookies below
    }

    // Instagram: Try scraper API first
    if (platform === 'instagram') {
      const igResult = await handleInstagram(url);
      if (igResult) {
        return NextResponse.json(igResult);
      }
    }

    // Threads: Try native HTML parsing first
    if (platform === 'threads') {
      const threadsResult = await handleThreads(url);
      if (threadsResult) {
        return NextResponse.json(threadsResult);
      }
    }

    // All other platforms (including fallback): Use btch-downloader
    try {
      // Dynamic import to avoid issues if not found
      const btch = require('btch-downloader');
      let result: any = null;

      if (platform === 'youtube') {
        const yt = await btch.youtube(url);
        if (yt && yt.status) {
          result = {
            success: true,
            title: yt.title || 'YouTube Video',
            thumbnail: yt.thumbnail || '',
            duration: 0,
            resolution: '720p',
            filesize: 0,
            ext: 'mp4',
            platform: 'youtube',
            uploader: yt.author || '',
            directUrl: yt.mp4,
            audioUrl: yt.mp3,
            source: 'btch-youtube',
          };
        }
      } else if (platform === 'tiktok') {
        const tt = await btch.ttdl(url);
        if (tt && tt.status) {
           result = {
              success: true,
              title: tt.title || 'TikTok Video',
              thumbnail: tt.thumbnail || '',
              duration: 0,
              resolution: '',
              filesize: 0,
              ext: 'mp4',
              platform: 'tiktok',
              uploader: '',
              directUrl: tt.video?.[0] || '',
              audioUrl: tt.audio?.[0] || '',
              source: 'btch-tiktok',
           };
        }
      } else if (platform === 'instagram') {
        const ig = await btch.igdl(url);
        if (ig && ig.status && ig.result && ig.result.length > 0) {
           result = {
              success: true,
              title: 'Instagram Post',
              thumbnail: ig.result[0].thumbnail || '',
              duration: 0,
              resolution: '',
              filesize: 0,
              ext: 'mp4',
              platform: 'instagram',
              uploader: '',
              directUrl: ig.result[0].url,
              source: 'btch-ig',
           };
        }
      } else if (platform === 'facebook') {
        const fb = await btch.fbdown(url);
        if (fb && fb.status) {
           result = {
              success: true,
              title: 'Facebook Video',
              thumbnail: '',
              duration: 0,
              resolution: 'HD',
              filesize: 0,
              ext: 'mp4',
              platform: 'facebook',
              uploader: '',
              directUrl: fb.HD || fb.Normal_video,
              source: 'btch-fb',
           };
        }
      } else if (platform === 'twitter') {
        const tw = await btch.twitter(url);
        if (tw && tw.status && tw.url && tw.url.length > 0) {
           let directUrl = '';
           if (tw.url[0].hd) directUrl = tw.url[0].hd;
           else if (tw.url[0].sd) directUrl = tw.url[0].sd;
           else if (tw.url[0].url) directUrl = tw.url[0].url;

           result = {
              success: true,
              title: tw.title || 'Twitter Video',
              thumbnail: '',
              duration: 0,
              resolution: '',
              filesize: 0,
              ext: 'mp4',
              platform: 'twitter',
              uploader: '',
              directUrl: directUrl,
              source: 'btch-tw',
           };
        }
      }

      if (result && result.directUrl) {
        return NextResponse.json(result);
      } else {
        return NextResponse.json({ error: 'Gagal mendapatkan info video. Pastikan URL valid dan video bisa diakses publik.' }, { status: 400 });
      }
    } catch (error: any) {
      console.error('btch-downloader info error:', error.message);
      return NextResponse.json({
        error: 'Terjadi kesalahan saat memproses video dengan btch-downloader.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
