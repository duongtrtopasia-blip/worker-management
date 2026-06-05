export const dynamic = 'force-dynamic';

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

    // Request metadata from Graph API to get the pre-authenticated download URL
    const metadataUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/App_Uploads/${filename}`;
    const metadataResponse = await fetch(metadataUrl, {
      cache: 'no-store',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!metadataResponse.ok) {
      console.error('OneDrive metadata fetch failed for', filename, metadataResponse.status, await metadataResponse.text());
      return new NextResponse('Image not found', { status: 404 });
    }

    const metadata = await metadataResponse.json();
    const downloadUrl = metadata['@microsoft.graph.downloadUrl'];

    if (!downloadUrl) {
      return new NextResponse('Download URL not found', { status: 500 });
    }

    // Now proxy the bytes from the pre-authenticated download URL
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      console.error('OneDrive byte fetch failed for', filename, response.status, await response.text());
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
