# Design: Correct MP3/MP4 downloads + YouTube resolution picker

## Problem
1. Choosing "Audio (MP3)" for Instagram/Facebook (and any platform without a
   genuine separate audio source) downloads MP4 bytes relabeled with a `.mp3`
   extension and `audio/mpeg` content type. No real extraction happens.
2. YouTube downloads always pull a single hardcoded quality with no resolution
   choice, and the bundled `yt-dlp.exe` / `bin/ffmpeg.exe` are Windows
   binaries that cannot execute on Vercel's Linux serverless functions —
   so any binary-dependent feature already silently fails in production.

## Fix

### Dependencies
- Drop `bin/ffmpeg.exe`, `bin/ffprobe.exe`, the root `yt-dlp.exe`.
- Use the already-installed `ffmpeg-static` (resolves to a Linux binary on
  Vercel) and `youtube-dl-exec` (wraps a yt-dlp binary, also platform-aware)
  npm packages instead of the hardcoded `.exe` paths.

### Real audio extraction (`/api/download/stream`)
When `type=audio` and the platform handler did not return a genuine
audio-only `audioUrl` (or even when it did, for codec consistency), spawn
ffmpeg (`-vn -acodec libmp3lame`) and pipe the fetched source stream through
it, writing real MP3 bytes to the HTTP response as they're produced. No full
buffering — output streams as it's generated, which matters under Vercel's
function time limit.

### YouTube resolution picker
- New route `/api/download/youtube-stream`.
- Runs `youtube-dl-exec` with
  `-f "bestvideo[height<=X]+bestaudio/best[height<=X]" --merge-output-format mp4 -o -`
  (X = 360/720/1080), using `ffmpeg-static`'s binary path for muxing.
- Pipes stdout directly to the HTTP response (streaming, not buffered).
- If the exact height isn't available, yt-dlp's `<=` selector falls back to
  the next best real resolution automatically.

### Vercel/runtime constraints (Hobby plan)
- `export const runtime = 'nodejs'` and `export const maxDuration = 60`
  (Hobby's cap) on both stream routes.
- Streaming output is what makes 60s survivable — bytes start flowing
  immediately instead of waiting for a full transcode.
- If a video is too long to finish in time, return a clear error message
  rather than hanging indefinitely.

### UI (`src/app/page.tsx`)
- YouTube results in the "ready" phase show three resolution buttons
  (360p / 720p / 1080p) instead of one generic "Download Video" button.
- Other platforms keep the existing single video/audio button pair (their
  sources only ever expose one quality).
- Existing chunked-fetch progress bar logic is reused, just pointed at the
  new/fixed endpoints.

## Out of scope (separate subsystems, separate specs)
- Admin analytics dashboard (Google Analytics realtime + admin features).
- SEO work / search ranking.
- General performance & mobile-first pass.
