import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    // Forward the request to the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const queryString = orderId ? `?orderId=${orderId}` : '';
    
    const response = await fetch(`${backendUrl}/notifications/whatsapp-link${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('WhatsApp link API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to generate WhatsApp link' 
      },
      { status: 500 }
    );
  }
}