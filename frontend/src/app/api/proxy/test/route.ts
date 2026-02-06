import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const API_URL = process.env.BACKEND_API_URL || process.env.API_URL || 'http://89.116.229.113:3001/api';
  
  return NextResponse.json({
    status: 'ok',
    message: 'Proxy route is working',
    backendUrl: API_URL,
    timestamp: new Date().toISOString(),
  });
}
