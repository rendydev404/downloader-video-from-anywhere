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
    const property = getGa4PropertyPath();

    const [daily, devices, countries, downloads] = await Promise.all([
      client.runReport({
        property,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      client.runReport({
        property,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
      }),
      client.runReport({
        property,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
      client.runReport({
        property,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'customEvent:platform' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { value: 'download' },
          },
        },
      }).catch(() => null), // fails until the custom dimension is registered in GA4 UI
    ]);

    const dailySeries = (daily[0].rows || []).map((row) => ({
      date: row.dimensionValues?.[0]?.value || '',
      sessions: Number(row.metricValues?.[0]?.value || 0),
      pageViews: Number(row.metricValues?.[1]?.value || 0),
    }));

    const deviceBreakdown = (devices[0].rows || []).map((row) => ({
      device: row.dimensionValues?.[0]?.value || 'Unknown',
      sessions: Number(row.metricValues?.[0]?.value || 0),
    }));

    const topCountries = (countries[0].rows || []).map((row) => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      sessions: Number(row.metricValues?.[0]?.value || 0),
    }));

    const downloadsByPlatform = downloads
      ? (downloads[0].rows || []).map((row) => ({
          platform: row.dimensionValues?.[0]?.value || 'Unknown',
          count: Number(row.metricValues?.[0]?.value || 0),
        }))
      : null; // null signals "custom dimension not registered yet"

    return NextResponse.json({
      configured: true,
      dailySeries,
      deviceBreakdown,
      topCountries,
      downloadsByPlatform,
    });
  } catch (error: any) {
    console.error('GA4 summary error:', error.message);
    return NextResponse.json({ configured: true, error: 'Gagal mengambil data GA4.' }, { status: 500 });
  }
}
