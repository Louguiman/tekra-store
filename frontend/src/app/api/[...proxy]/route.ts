import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Hardcoded backend URL
const API_URL = 'http://89.116.229.113:3001/api';

export async function GET(request: NextRequest) {
  return handleRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return handleRequest(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request, 'DELETE');
}

async function handleRequest(request: NextRequest, method: string) {
  try {
    // Extract path from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Remove 'api' from path segments
    const apiIndex = pathSegments.indexOf('api');
    if (apiIndex !== -1) {
      pathSegments.splice(0, apiIndex + 1);
    }
    
    const path = pathSegments.join('/');
    const queryString = url.searchParams.toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;
    
    // Build backend URL
    const backendUrl = `${API_URL}/${fullPath}`;
    
    console.log(`[Proxy] ${method} ${fullPath} → ${backendUrl}`);
    
    // Prepare headers
    const headers: HeadersInit = {};
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['authorization'] = authHeader;
    
    const contentType = request.headers.get('content-type');
    if (contentType) headers['content-type'] = contentType;
    
    const cookie = request.headers.get('cookie');
    if (cookie) headers['cookie'] = cookie;
    
    // Prepare request
    const options: RequestInit = {
      method,
      headers,
      cache: 'no-store',
    };
    
    // Add body for mutations
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const body = await request.text();
        if (body) options.body = body;
      } catch (e) {
        console.log('[Proxy] No body');
      }
    }
    
    // Make request to backend
    const response = await fetch(backendUrl, options);
    console.log(`[Proxy] Response: ${response.status}`);
    
    // Get response
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    if (!response.ok) {
      console.error(`[Proxy] Error ${response.status}:`, responseData);
    }
    
    // Return response
    const nextResponse = NextResponse.json(responseData, {
      status: response.status,
    });
    
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) nextResponse.headers.set('set-cookie', setCookie);
    
    return nextResponse;
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      {
        error: 'Proxy failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
