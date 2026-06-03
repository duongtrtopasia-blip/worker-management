import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/onedrive';

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = params.filename;
    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 });
    }

    const token = await getAccessToken();
    if (!token) {
      return new NextResponse('Unauthorized: Cannot get OneDrive token', { status: 401 });
    }

    const downloadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/App_Uploads/${filename}:/content`;
    
    const response = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      console.error('OneDrive fetch failed for', filename, await response.text());
      return new NextResponse('Image not found', { status: 404 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    console.error('Proxy image error:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
