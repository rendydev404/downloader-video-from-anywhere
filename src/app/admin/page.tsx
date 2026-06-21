"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface RealtimeData {
  configured: boolean;
  totalActiveUsers?: number;
  rows?: { country: string; device: string; activeUsers: number }[];
  error?: string;
}

interface SummaryData {
  configured: boolean;
  dailySeries?: { date: string; sessions: number; pageViews: number }[];
  deviceBreakdown?: { device: string; sessions: number }[];
  topCountries?: { country: string; sessions: number }[];
  downloadsByPlatform?: { platform: string; count: number }[] | null;
  error?: string;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel p-5 rounded-2xl">
      <h2 className="text-sm font-semibold text-white/70 mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ga/realtime");
      setRealtime(await res.json());
    } catch {
      setRealtime({ configured: true, error: "Gagal memuat data." });
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ga/summary");
      setSummary(await res.json());
    } catch {
      setSummary({ configured: true, error: "Gagal memuat data." });
    }
  }, []);

  useEffect(() => {
    fetchRealtime();
    fetchSummary();
    const interval = setInterval(fetchRealtime, 15000);
    return () => clearInterval(interval);
  }, [fetchRealtime, fetchSummary]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const notConfigured = realtime && !realtime.configured;

  return (
    <main className="min-h-screen bg-[#0a0512] px-4 py-8 text-white">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-white/60 hover:text-white border border-white/10 rounded-lg px-4 py-2"
          >
            Logout
          </button>
        </div>

        {notConfigured && (
          <div className="glass p-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 text-sm">
            <p className="font-medium mb-1">Google Analytics belum dikonfigurasi.</p>
            <p className="text-yellow-200/70">
              Set env vars <code>NEXT_PUBLIC_GA_MEASUREMENT_ID</code>,{" "}
              <code>GA4_PROPERTY_ID</code>, <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code>, dan{" "}
              <code>GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code> untuk mengaktifkan dashboard ini.
              Lihat <code>docs/superpowers/specs/2026-06-21-admin-dashboard-design.md</code> untuk
              langkah lengkap.
            </p>
          </div>
        )}

        <Card title="Active Users Right Now">
          <p className="text-4xl font-bold">
            {realtime?.totalActiveUsers ?? (realtime?.configured ? "0" : "—")}
          </p>
          {realtime?.rows && realtime.rows.length > 0 && (
            <table className="w-full mt-4 text-sm">
              <thead>
                <tr className="text-white/40 text-left">
                  <th className="pb-2">Country</th>
                  <th className="pb-2">Device</th>
                  <th className="pb-2 text-right">Active</th>
                </tr>
              </thead>
              <tbody>
                {realtime.rows.map((r, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-1.5">{r.country}</td>
                    <td className="py-1.5">{r.device}</td>
                    <td className="py-1.5 text-right">{r.activeUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <div className="grid sm:grid-cols-2 gap-6">
          <Card title="Sessions & Pageviews (7 days)">
            {summary?.dailySeries && summary.dailySeries.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-left">
                    <th className="pb-2">Date</th>
                    <th className="pb-2 text-right">Sessions</th>
                    <th className="pb-2 text-right">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.dailySeries.map((d, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="py-1.5">{d.date}</td>
                      <td className="py-1.5 text-right">{d.sessions}</td>
                      <td className="py-1.5 text-right">{d.pageViews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-white/40 text-sm">Belum ada data.</p>
            )}
          </Card>

          <Card title="Device Breakdown (7 days)">
            {summary?.deviceBreakdown && summary.deviceBreakdown.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {summary.deviceBreakdown.map((d, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="capitalize">{d.device}</span>
                    <span className="text-white/60">{d.sessions}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white/40 text-sm">Belum ada data.</p>
            )}
          </Card>

          <Card title="Top Countries (7 days)">
            {summary?.topCountries && summary.topCountries.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {summary.topCountries.map((c, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span>{c.country}</span>
                    <span className="text-white/60">{c.sessions}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white/40 text-sm">Belum ada data.</p>
            )}
          </Card>

          <Card title="Downloads by Platform (7 days)">
            {summary?.downloadsByPlatform === null ? (
              <p className="text-white/40 text-sm">
                Daftarkan custom dimension <code>platform</code> pada event{" "}
                <code>download</code> di GA4 Admin → Custom definitions untuk mengaktifkan ini.
              </p>
            ) : summary?.downloadsByPlatform && summary.downloadsByPlatform.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {summary.downloadsByPlatform.map((p, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="capitalize">{p.platform}</span>
                    <span className="text-white/60">{p.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white/40 text-sm">Belum ada data.</p>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
