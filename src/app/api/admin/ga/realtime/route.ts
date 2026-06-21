import { NextResponse } from 'next/server';
import { getGa4Client, getGa4PropertyPath, isGa4Configured } from '@/lib/ga4Client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isGa4Configured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const client = getGa4Client();
    const [response] = await client.runRealtimeReport({
      property: getGa4PropertyPath(),
      dimensions: [{ name: 'country' }, { name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const rows = (response.rows || []).map((row) => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      device: row.dimensionValues?.[1]?.value || 'Unknown',
      activeUsers: Number(row.metricValues?.[0]?.value || 0),
    }));

    const totalActiveUsers = rows.reduce((sum, r) => sum + r.activeUsers, 0);

    return NextResponse.json({ configured: true, totalActiveUsers, rows });
  } catch (error: any) {
    console.error('GA4 realtime error:', error.message);
    return NextResponse.json({ configured: true, error: 'Gagal mengambil data GA4.' }, { status: 500 });
  }
}
