"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiDownload, FiLink, FiCheckCircle, FiAlertCircle, FiVideo, FiLoader } from "react-icons/fi";
import axios from "axios";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; title: string } | null>(null);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post("/api/download", { url });
      if (response.data && response.data.success) {
        setResult({
          url: response.data.url,
          title: response.data.title || "Video Siap Diunduh",
        });
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Terjadi kesalahan saat memproses tautan."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-animate overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

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
            Universal Downloader
          </h1>
          <p className="text-foreground/60 text-lg max-w-lg mx-auto">
            Unduh video dari TikTok, Instagram, atau YouTube tanpa watermark dengan kualitas terbaik.
          </p>
        </div>

        {/* Main Input Form */}
        <motion.form
          onSubmit={handleDownload}
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
          />
          <button
            type="submit"
            disabled={isLoading || !url}
            className="bg-primary hover:bg-primary-hover text-white rounded-xl px-6 py-4 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <FiLoader className="w-6 h-6" />
              </motion.div>
            ) : (
              <span>Unduh</span>
            )}
          </button>
        </motion.form>

        {/* Results Area */}
        <div className="w-full mt-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="glass p-4 rounded-xl border border-red-500/30 flex items-start gap-3 text-red-200 bg-red-500/10 overflow-hidden"
              >
                <FiAlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}

            {result && !error && !isLoading && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="glass-panel p-6 w-full flex flex-col sm:flex-row items-center gap-6"
              >
                <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center shrink-0">
                  <FiVideo className="w-10 h-10 text-primary/80" />
                </div>
                
                <div className="flex-1 text-center sm:text-left overflow-hidden">
                  <h3 className="text-xl font-semibold mb-2 truncate">
                    {result.title}
                  </h3>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-green-400 text-sm mb-4">
                    <FiCheckCircle />
                    <span>Siap diunduh</span>
                  </div>
                </div>

                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-xl font-bold transition-all duration-300 whitespace-nowrap shadow-lg shadow-white/10"
                >
                  Simpan Video
                </a>
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
        Didesain dengan antarmuka Liquid Glass
      </motion.p>
    </main>
  );
}
