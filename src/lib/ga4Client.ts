import { BetaAnalyticsDataClient } from '@google-analytics/data';

export function isGa4Configured(): boolean {
  return Boolean(
    process.env.GA4_PROPERTY_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

export function getGa4Client(): BetaAnalyticsDataClient {
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // Vercel env vars store newlines escaped as literal \n; unescape them.
      private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
  });
}

export function getGa4PropertyPath(): string {
  return `properties/${process.env.GA4_PROPERTY_ID}`;
}
