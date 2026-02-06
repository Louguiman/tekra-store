import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Catch-all proxy route is working',
    backendUrl: 'http://89.116.229.113:3001/api',
    timestamp: new Date().toISOString(),
    note: 'All /api/* requests (except /api/test) are proxied to backend',
  });
}
