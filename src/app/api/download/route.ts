import { NextResponse } from 'next/server';
import axios from 'axios';
import ytdl from '@distube/ytdl-core';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL tidak boleh kosong.' }, { status: 400 });
    }

    const isTikTok = url.includes('tiktok.com');
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isInstagram = url.includes('instagram.com');
    const isFacebook = url.includes('facebook.com') || url.includes('fb.watch');

    // 1. TIKTOK (TikWM - 100% Works)
    if (isTikTok) {
      try {
        const response = await axios.post('https://www.tikwm.com/api/', { url, count: 12, cursor: 0, web: 1, hd: 1 });
        const data = response.data.data;
        if (data) {
          return NextResponse.json({
            title: data.title || 'Video TikTok',
            thumbnail: data.cover || '',
            url: data.hdplay || data.play,
            platform: 'tiktok'
          });
        }
      } catch (e) {
        console.error("TikWM Error:", e);
      }
    }

    // 2. YOUTUBE (YTDL-Core with Fallback)
    if (isYouTube) {
      try {
        const info = await ytdl.getInfo(url);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });
        if (format && format.url) {
          return NextResponse.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0]?.url || '',
            url: format.url,
            platform: 'youtube'
          });
        }
      } catch (error: any) {
        console.error("YTDL Error:", error.message);
        if (error.message.includes('unavailable') || error.message.includes('private')) {
           return NextResponse.json({ error: 'Video YouTube ini tidak tersedia, privat, atau telah dihapus.' }, { status: 400 });
        }
      }
    }

    // 3. NATIVE FALLBACK (YT-DLP) for Any Platform if yt-dlp.exe is available
    // yt-dlp is extremely powerful and bypasses most restrictions locally.
    const ytdlpPath = path.join(process.cwd(), 'yt-dlp.exe');
    if (fs.existsSync(ytdlpPath)) {
      try {
        const { stdout } = await execFileAsync(ytdlpPath, ['--dump-json', url]);
        const data = JSON.parse(stdout);
        if (data.url || (data.formats && data.formats.length > 0)) {
           // Find best format with both video and audio
           let bestUrl = data.url;
           if (!bestUrl && data.formats) {
               const bestFormat = data.formats.filter((f: any) => f.vcodec !== 'none' && f.acodec !== 'none').pop();
               if (bestFormat) bestUrl = bestFormat.url;
               else bestUrl = data.formats.pop()?.url;
           }
           
           if (bestUrl) {
               return NextResponse.json({
                 title: data.title || 'Video',
                 thumbnail: data.thumbnail || '',
                 url: bestUrl,
                 platform: isYouTube ? 'youtube' : isInstagram ? 'instagram' : isFacebook ? 'facebook' : 'other'
               });
           }
        }
      } catch (e: any) {
        console.error("YT-DLP Error:", e.message);
      }
    }

    // 4. INSTAGRAM & FACEBOOK (Public Scraper APIs)
    if (isInstagram || isFacebook) {
      try {
         // Proxy via rapid API alternatives or public web endpoints if deployed
         const response = await axios.post('https://v3.igdownloader.app/api/ajaxSearch', 
            new URLSearchParams({ q: url, t: 'media', lang: 'en' }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' } }
         );
         
         if (response.data && response.data.data) {
            // Very naive HTML parsing to extract MP4 link from the response string
            const match = response.data.data.match(/href="([^"]+\.mp4[^"]*)"/i);
            if (match && match[1]) {
                return NextResponse.json({
                  title: isInstagram ? 'Instagram Video' : 'Facebook Video',
                  thumbnail: '',
                  url: match[1],
                  platform: isInstagram ? 'instagram' : 'facebook'
                });
            }
         }
      } catch (e) {
         console.error("IG/FB Scraper Error:", e);
      }
    }

    // If all methods fail
    return NextResponse.json({ 
      error: 'Gagal mengunduh video. Video mungkin privat, dihapus, atau platform sedang memblokir akses. Coba gunakan link lain atau coba lagi nanti.' 
    }, { status: 500 });

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat memproses link Anda.' }, { status: 500 });
  }
}
