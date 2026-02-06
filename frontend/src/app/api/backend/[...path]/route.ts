import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://backend:3001/api';

/**
 * Catch-all proxy route for all backend API requests
 * This allows Redux RTK Query to use internal Docker network
 * 
 * Example:
 * Browser request: /api/backend/products
 * Proxied to: http://backend:3001/api/products
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'DELETE');
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Reconstruct the path
    const path = pathSegments.join('/');
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;
    
    // Build the backend URL
    const backendUrl = `${API_URL}/${fullPath}`;
    
    // Prepare headers
    const headers: HeadersInit = {};
    
    // Copy relevant headers from the original request
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }
    
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['content-type'] = contentType;
    }
    
    // Copy cookies for session-based auth
    const cookie = request.headers.get('cookie');
    if (cookie) {
      headers['cookie'] = cookie;
    }
    
    // Prepare request options
    const options: RequestInit = {
      method,
      headers,
      // Disable caching for API requests
      cache: 'no-store',
    };
    
    // Add body for POST, PUT, PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const body = await request.text();
        if (body) {
          options.body = body;
        }
      } catch (error) {
        // Body might be empty, which is fine
      }
    }
    
    // Make the request to the backend
    const response = await fetch(backendUrl, options);
    
    // Get response body
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    // Create response with same status and headers
    const nextResponse = NextResponse.json(responseData, {
      status: response.status,
      statusText: response.statusText,
    });
    
    // Copy relevant response headers
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      nextResponse.headers.set('set-cookie', setCookie);
    }
    
    return nextResponse;
  } catch (error) {
    console.error(`Proxy error for ${method} /${pathSegments.join('/')}:`, error);
    
    return NextResponse.json(
      {
        error: 'Proxy request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
