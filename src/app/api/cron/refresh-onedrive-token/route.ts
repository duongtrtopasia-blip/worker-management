/**
 * Cron Job: Tự động refresh OneDrive token hàng ngày
 * Route: GET /api/cron/refresh-onedrive-token
 *
 * Được gọi bởi Vercel Cron mỗi ngày lúc 02:00 (UTC+7 = 19:00 UTC ngày trước)
 * để đảm bảo refresh token không bao giờ hết hạn.
 *
 * Microsoft refresh token hết hạn sau 90 ngày không dùng.
 * Bằng cách gọi hàng ngày, token sẽ luôn được gia hạn tự động.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/onedrive';

export async function GET(req: NextRequest) {
  // Bảo mật: chỉ cho phép gọi từ Vercel Cron hoặc với secret header
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || '';

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] Bắt đầu refresh OneDrive token...');

  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      console.error('[Cron] Refresh token thất bại — access token là null');
      return NextResponse.json(
        {
          success: false,
          message: 'Không lấy được access token. Refresh token có thể đã hết hạn.',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    console.log('[Cron] Refresh OneDrive token thành công!');

    return NextResponse.json({
      success: true,
      message: 'Refresh token OneDrive thành công. Token mới đã được lưu vào Supabase.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Lỗi khi refresh token:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Lỗi: ${error.message}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
