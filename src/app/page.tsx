"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiDownload,
  FiLink,
  FiCheckCircle,
  FiAlertCircle,
  FiVideo,
  FiLoader,
  FiClock,
  FiUser,
  FiMonitor,
  FiMusic,
} from "react-icons/fi";
import axios from "axios";

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  resolution: string;
  filesize: number;
  ext: string;
  platform: string;
  uploader: string;
  directUrl?: string;
  audioUrl?: string;
  source?: string;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFilesize(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    tiktok: "🎵",
    youtube: "🎬",
    instagram: "📸",
    facebook: "📘",
    twitter: "🐦",
    reddit: "🔴",
    vimeo: "🎥",
    twitch: "🟣",
    dailymotion: "▶️",
    bilibili: "📺",
    threads: "🧵",
    other: "🌐",
  };
  return icons[platform] || "🌐";
}

function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    tiktok: "TikTok",
    youtube: "YouTube",
    instagram: "Instagram",
    facebook: "Facebook",
    twitter: "Twitter/X",
    reddit: "Reddit",
    vimeo: "Vimeo",
    twitch: "Twitch",
    dailymotion: "Dailymotion",
    bilibili: "Bilibili",
    threads: "Threads",
    other: "Website",
  };
  return names[platform] || "Website";
}

type DownloadPhase = "idle" | "fetching-info" | "ready" | "downloading" | "saving" | "done" | "error";

export default function Home() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<DownloadPhase>("idle");
  const [progress, setProgress] = useState(0); // 0-100
  const [downloadedSize, setDownloadedSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoInfo | null>(null);

  const getPhaseText = useCallback(() => {
    switch (phase) {
      case "fetching-info": return "Fetching video info...";
      case "downloading": return progress > 0
        ? `Downloading... ${progress}% (${formatFilesize(downloadedSize)})`
        : `Downloading direct stream... ${formatFilesize(downloadedSize)}`;
      case "saving": return "Saving file...";
      case "done": return "Done! File saved to your Downloads folder.";
      default: return "";
    }
  }, [phase, progress, downloadedSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || phase === "fetching-info" || phase === "downloading") return;

    setPhase("fetching-info");
    setError(null);
    setResult(null);
    setProgress(0);
    setDownloadedSize(0);

    try {
      // Step 1: Get video info
      const infoResponse = await axios.post("/api/download", { url });
      if (!infoResponse.data?.success) {
        throw new Error(infoResponse.data?.error || "Failed to get video info.");
      }
      
      const videoInfo: VideoInfo = infoResponse.data;
      setResult(videoInfo);

      // Stop here and ask for format
      setPhase("ready");

    } catch (err: any) {
      console.error("Info error:", err);
      setError(err.response?.data?.error || err.message || "An error occurred while fetching info.");
      setPhase("error");
    }
  };

  const handleDownloadFormat = async (type: 'video' | 'audio', res?: string) => {
    if (!result || !url) return;
    
    setPhase("downloading");
    setError(null);
    setProgress(0);
    setDownloadedSize(0);

    try {
      // Step 2: Start downloading via fetch (so we can track progress)
      
      // Build stream URL with appropriate params based on source
      const streamParams = new URLSearchParams();
      streamParams.set('url', url);
      streamParams.set('title', result.title || 'video');
      streamParams.set('type', type);
      if (res) {
        streamParams.set('res', res);
      }
      if (type === 'audio' && result.audioUrl) {
        streamParams.set('directUrl', result.audioUrl);
      } else if (result.directUrl) {
        streamParams.set('directUrl', result.directUrl);
      }
      if (result.source) {
        streamParams.set('source', result.source);
      }
      if (result.ext) {
        streamParams.set('ext', result.ext);
      }
      const streamUrl = `/api/download/stream?${streamParams.toString()}`;
      const response = await fetch(streamUrl);
      
      if (!response.ok) {
        let errMsg = "Failed to download video.";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch { /* ignore parse error */ }
        throw new Error(errMsg);
      }

      // Get content length for progress tracking
      const contentLength = response.headers.get("Content-Length");
      const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
      
      // Get filename from Content-Disposition header
      const fallbackExt = type === 'audio' ? '.mp3' : `.${result.ext || 'mp4'}`;
      let filename = "RELOAD_" + (result.title || "video").replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_') + fallbackExt;
      const disposition = response.headers.get("Content-Disposition");
      if (disposition) {
        const match = disposition.match(/filename\*=UTF-8''(.+)/);
        if (match) filename = decodeURIComponent(match[1]);
        else {
          const match2 = disposition.match(/filename="(.+?)"/);
          if (match2) filename = match2[1];
        }
      }

      // Read the response body as chunks for progress
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Cannot read response stream");

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        received += value.length;
        setDownloadedSize(received);
        
        if (totalSize > 0) {
          setProgress(Math.round((received / totalSize) * 100));
        }
      }

      // Step 3: Create blob and trigger download
      setPhase("saving");
      
      let mimeType = type === 'audio' ? "audio/mpeg" : "video/mp4";
      if (result.ext === 'jpg' || result.ext === 'jpeg') mimeType = "image/jpeg";
      if (result.ext === 'png') mimeType = "image/png";
      
      const blob = new Blob(chunks as BlobPart[], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Revoke blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      setPhase("done");
      setProgress(100);

    } catch (err: any) {
      console.error("Download error:", err);
      setError(err.response?.data?.error || err.message || "An error occurred.");
      setPhase("error");
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setError(null);
    setResult(null);
    setProgress(0);
    setDownloadedSize(0);
    setUrl("");
  };

  const isProcessing = phase === "fetching-info" || phase === "downloading" || phase === "saving";

  return (
    <main className="relative min-h-[100svh] w-full flex flex-col items-center justify-center px-4 py-10 sm:p-8 bg-[#0a0512] overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/15 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-2xl z-10 flex flex-col items-center"
      >
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-[2.75rem] leading-none sm:text-6xl font-extrabold tracking-tight mb-3 sm:mb-4 text-white drop-shadow-[0_0_22px_rgba(124,131,255,0.65)]">
            RELOAD
          </h1>
          <p className="text-foreground/60 text-sm sm:text-lg max-w-lg mx-auto px-2 text-balance">
            Download Video without watermark from any social media
          </p>
        </div>

        {/* Main Input Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="w-full relative glass-panel !rounded-[26px] p-2 flex flex-col sm:flex-row sm:items-center gap-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/40 focus-within:shadow-[0_0_40px_-8px_rgba(124,131,255,0.4)]"
          layout
        >
          <div className="flex items-center flex-1 w-full min-w-0">
            <div className="pl-3 pr-2 text-foreground/40 shrink-0">
              <FiLink className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste your video link here..."
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground placeholder:text-foreground/30 py-3.5 sm:py-4 px-1 text-base sm:text-lg"
              required
              autoComplete="off"
              inputMode="url"
              disabled={isProcessing}
            />
          </div>
          <button
            type="submit"
            disabled={isProcessing || !url || phase === "ready"}
            className="glass-btn hover:glass-btn-hover text-white rounded-[20px] px-6 py-3.5 sm:py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-full sm:w-auto sm:min-w-[140px] gap-2 active:scale-[0.97]"
          >
            {isProcessing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <FiLoader className="w-5 h-5" />
                </motion.div>
                <span className="text-sm">Processing...</span>
              </>
            ) : (
              <>
                <FiDownload className="w-5 h-5" />
                <span>Download</span>
              </>
            )}
          </button>
        </motion.form>

        {/* Supported platforms bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-foreground/30 text-xs sm:text-sm px-2"
        >
          <span className="w-full sm:w-auto text-center">Supports:</span>
          {["YouTube", "TikTok", "Instagram", "Threads", "Facebook", "Twitter/X"].map((p) => (
            <span key={p} className="px-3 py-1 rounded-full glass text-foreground/50 text-xs hover:text-foreground/80 hover:scale-105 transition-all cursor-default">
              {p}
            </span>
          ))}
        </motion.div>

        {/* Results / Progress Area */}
        <div className="w-full mt-6">
          <AnimatePresence mode="wait">
            {/* Error State */}
            {phase === "error" && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass p-5 rounded-xl border border-red-500/30 bg-red-500/10 overflow-hidden"
              >
                <div className="flex items-start gap-3 text-red-200">
                  <FiAlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{error}</p>
                    <p className="text-red-300/60 text-sm mt-1">
                      Make sure the URL is correct and the video is publicly accessible.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="mt-4 w-full py-2 rounded-lg border border-red-500/20 text-red-200/70 hover:bg-red-500/10 transition-colors text-sm"
                >
                  Try Again
                </button>
              </motion.div>
            )}

            {/* Processing / Result State */}
            {(isProcessing || phase === "done" || phase === "ready") && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="glass-panel p-4 sm:p-6 w-full"
              >
                {/* Video Info */}
                {result && (
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 mb-5">
                    <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-2xl glass flex items-center justify-center shrink-0 overflow-hidden">
                      {result.thumbnail ? (
                        <img
                          src={`/api/proxy/image?url=${encodeURIComponent(result.thumbnail)}`}
                          alt={result.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-3xl">${getPlatformIcon(result.platform)}</span>`;
                          }}
                        />
                      ) : (
                        <span className="text-3xl">{getPlatformIcon(result.platform)}</span>
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left overflow-hidden">
                      <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                          {getPlatformName(result.platform)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mb-1 line-clamp-2">{result.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-foreground/50 text-xs justify-center sm:justify-start">
                        {result.duration > 0 && (
                          <span className="flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            {formatDuration(result.duration)}
                          </span>
                        )}
                        {result.resolution && (
                          <span className="flex items-center gap-1">
                            <FiMonitor className="w-3 h-3" />
                            {result.resolution}
                          </span>
                        )}
                        {result.uploader && (
                          <span className="flex items-center gap-1">
                            <FiUser className="w-3 h-3" />
                            {result.uploader}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Format Selection */}
                {phase === "ready" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col mt-4"
                  >
                    {result?.platform === 'youtube' ? (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleDownloadFormat('video', '360')}
                            className="glass-btn hover:glass-btn-hover text-white py-3 px-2 rounded-2xl font-semibold flex items-center justify-center gap-1 active:scale-[0.97] text-sm"
                          >
                            <FiVideo className="w-4 h-4 hidden sm:block" />
                            360p
                          </button>
                          <button
                            onClick={() => handleDownloadFormat('video', '720')}
                            className="glass-btn hover:glass-btn-hover text-white py-3 px-2 rounded-2xl font-semibold flex items-center justify-center gap-1 active:scale-[0.97] text-sm"
                          >
                            <FiVideo className="w-4 h-4 hidden sm:block" />
                            720p
                          </button>
                          <button
                            onClick={() => handleDownloadFormat('video', '1080')}
                            className="glass-btn hover:glass-btn-hover text-white py-3 px-2 rounded-2xl font-semibold flex items-center justify-center gap-1 active:scale-[0.97] text-sm"
                          >
                            <FiVideo className="w-4 h-4 hidden sm:block" />
                            1080p
                          </button>
                        </div>
                        <button
                          onClick={() => handleDownloadFormat('audio')}
                          className="glass-btn hover:glass-btn-hover w-full text-white py-3 px-4 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-[0.97]"
                        >
                          <FiMusic className="w-5 h-5" />
                          Download Audio (MP3)
                        </button>
                      </div>
                    ) : result?.ext === 'jpg' || result?.ext === 'jpeg' || result?.ext === 'png' ? (
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => handleDownloadFormat('video')}
                          className="glass-btn hover:glass-btn-hover w-full text-white py-3 px-4 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-[0.97]"
                        >
                          <FiDownload className="w-5 h-5" />
                          Download Image ({result?.ext.toUpperCase()})
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleDownloadFormat('video')}
                          className="glass-btn hover:glass-btn-hover flex-1 text-white py-3 px-4 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-[0.97]"
                        >
                          <FiVideo className="w-5 h-5" />
                          Download Video (MP4)
                        </button>
                        <button
                          onClick={() => handleDownloadFormat('audio')}
                          className="glass-btn hover:glass-btn-hover flex-1 text-white py-3 px-4 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-[0.97]"
                        >
                          <FiMusic className="w-5 h-5" />
                          Download Audio (MP3)
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Progress Bar — liquid fill */}
                {isProcessing && phase !== "fetching-info" && (
                  <div className="space-y-3">
                    <div className="liquid-progress-track">
                      <motion.div
                        className="liquid-progress-fill"
                        initial={{ width: "0%" }}
                        animate={{
                          width: phase === "downloading" && progress > 0
                            ? `${progress}%`
                            : phase === "downloading"
                            ? "28%"
                            : phase === "saving"
                            ? "95%"
                            : "0%",
                        }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-center text-foreground/55 text-sm">{getPhaseText()}</p>
                    {phase === "downloading" && progress === 0 && (
                      <p className="text-center text-foreground/30 text-xs">
                        Streaming directly from server...
                      </p>
                    )}
                  </div>
                )}

                {/* Fetching Info — indeterminate liquid bar */}
                {phase === "fetching-info" && (
                  <div className="space-y-3 mt-2">
                    <div className="liquid-progress-track">
                      <div className="liquid-progress-fill indeterminate" />
                    </div>
                    <p className="text-center text-foreground/55 text-sm">Fetching video info...</p>
                  </div>
                )}

                {/* Done State */}
                {phase === "done" && (
                  <div className="space-y-4">
                    <div className="liquid-progress-track">
                      <div className="liquid-progress-fill" style={{ width: "100%" }} />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <FiCheckCircle className="w-5 h-5" />
                      <span className="font-medium">{getPhaseText()}</span>
                    </div>
                    <button
                      onClick={handleReset}
                      className="w-full py-3 rounded-xl border border-white/10 text-foreground/60 hover:bg-white/5 transition-colors text-sm"
                    >
                      Download Another Video
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="mt-10 mb-2 text-foreground/30 text-xs sm:text-sm"
      >
        Powered by RELOAD
      </motion.p>
    </main>
  );
}
