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
      case "fetching-info": return "Mengambil info video...";
      case "downloading": return progress > 0 
        ? `Mengunduh... ${progress}% (${formatFilesize(downloadedSize)})`
        : `Mengunduh stream langsung... ${formatFilesize(downloadedSize)}`;
      case "saving": return "Menyimpan file...";
      case "done": return "Selesai! File tersimpan di folder Downloads.";
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
        throw new Error(infoResponse.data?.error || "Gagal mendapatkan info video.");
      }
      
      const videoInfo: VideoInfo = infoResponse.data;
      setResult(videoInfo);

      // Stop here and ask for format
      setPhase("ready");

    } catch (err: any) {
      console.error("Info error:", err);
      setError(err.response?.data?.error || err.message || "Terjadi kesalahan saat mengambil info.");
      setPhase("error");
    }
  };

  const handleDownloadFormat = async (type: 'video' | 'audio') => {
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
      if (result.directUrl) {
        streamParams.set('directUrl', result.directUrl);
      }
      if (result.source) {
        streamParams.set('source', result.source);
      }
      const streamUrl = `/api/download/stream?${streamParams.toString()}`;
      const response = await fetch(streamUrl);
      
      if (!response.ok) {
        let errMsg = "Gagal mengunduh video.";
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
      const fallbackExt = type === 'audio' ? '.mp3' : '.mp4';
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
      
      const blob = new Blob(chunks, { type: type === 'audio' ? "audio/mpeg" : "video/mp4" });
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
      setError(err.response?.data?.error || err.message || "Terjadi kesalahan.");
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
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-animate overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-40 h-40 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-2xl z-10 flex flex-col items-center"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center p-3 rounded-2xl glass mb-6"
          >
            <FiDownload className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
            RELOAD
          </h1>
          <p className="text-foreground/60 text-lg max-w-lg mx-auto">
            Unduh video dari platform manapun tanpa watermark. Mendukung 1000+ situs.
          </p>
        </div>

        {/* Main Input Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="w-full relative glass-panel p-2 flex items-center transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/50"
          layout
        >
          <div className="pl-4 pr-2 text-foreground/40">
            <FiLink className="w-6 h-6" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Tempelkan tautan video di sini..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-foreground/30 py-4 px-2 text-lg w-full"
            required
            autoComplete="off"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !url || phase === "ready"}
            className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6 py-4 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px] gap-2"
          >
            {isProcessing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <FiLoader className="w-5 h-5" />
                </motion.div>
                <span className="text-sm">Proses...</span>
              </>
            ) : (
              <>
                <FiDownload className="w-5 h-5" />
                <span>Unduh</span>
              </>
            )}
          </button>
        </motion.form>

        {/* Supported platforms bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 flex flex-wrap items-center justify-center gap-2 text-foreground/30 text-sm"
        >
          <span>Mendukung:</span>
          {["YouTube", "TikTok", "Instagram", "Facebook", "Twitter/X", "1000+ lainnya"].map((p) => (
            <span key={p} className="px-2 py-0.5 rounded-full glass text-foreground/40 text-xs">
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
                      Pastikan URL benar dan video dapat diakses secara publik.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="mt-4 w-full py-2 rounded-lg border border-red-500/20 text-red-200/70 hover:bg-red-500/10 transition-colors text-sm"
                >
                  Coba Lagi
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
                className="glass-panel p-6 w-full"
              >
                {/* Video Info */}
                {result && (
                  <div className="flex flex-col sm:flex-row items-center gap-5 mb-5">
                    <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center shrink-0 overflow-hidden">
                      {result.thumbnail ? (
                        <img
                          src={result.thumbnail}
                          alt={result.title}
                          className="w-full h-full object-cover"
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
                    className="flex flex-col sm:flex-row gap-3 mt-4"
                  >
                    <button
                      onClick={() => handleDownloadFormat('video')}
                      className="flex-1 bg-primary/90 hover:bg-primary text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/20"
                    >
                      <FiVideo className="w-5 h-5" />
                      Download Video (MP4)
                    </button>
                    <button
                      onClick={() => handleDownloadFormat('audio')}
                      className="flex-1 bg-purple-500/90 hover:bg-purple-500 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-500/20"
                    >
                      <FiMusic className="w-5 h-5" />
                      Download Audio (MP3)
                    </button>
                  </motion.div>
                )}

                {/* Progress Bar */}
                {isProcessing && phase !== "fetching-info" && phase !== "ready" && (
                  <div className="space-y-3">
                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500"
                        initial={{ width: "0%" }}
                        animate={{
                          width: phase === "fetching-info"
                            ? "15%"
                            : phase === "downloading" && progress > 0
                            ? `${progress}%`
                            : phase === "downloading"
                            ? "30%"
                            : phase === "saving"
                            ? "95%"
                            : "0%",
                        }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-foreground/60 text-sm">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <FiLoader className="w-4 h-4" />
                      </motion.div>
                      <span>{getPhaseText()}</span>
                    </div>
                    {phase === "downloading" && progress === 0 && (
                      <p className="text-center text-foreground/30 text-xs mt-2">
                        Sedang mengalirkan (streaming) data langsung dari server...
                      </p>
                    )}
                  </div>
                )}

                {/* Fetching Info Placeholder */}
                {phase === "fetching-info" && (
                  <div className="flex items-center justify-center gap-2 text-foreground/60 text-sm mt-4">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <FiLoader className="w-4 h-4" />
                    </motion.div>
                    <span>Mengambil info video...</span>
                  </div>
                )}

                {/* Done State */}
                {phase === "done" && (
                  <div className="space-y-4">
                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 w-full" />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <FiCheckCircle className="w-5 h-5" />
                      <span className="font-medium">{getPhaseText()}</span>
                    </div>
                    <button
                      onClick={handleReset}
                      className="w-full py-3 rounded-xl border border-white/10 text-foreground/60 hover:bg-white/5 transition-colors text-sm"
                    >
                      Unduh Video Lainnya
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
        className="absolute bottom-6 text-foreground/30 text-sm"
      >
        Powered by RELOAD
      </motion.p>
    </main>
  );
}
