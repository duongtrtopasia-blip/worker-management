/**
 * Debug endpoint — kiểm tra kết nối OneDrive
 * Truy cập: https://your-domain.vercel.app/api/test-onedrive
 * XÓA FILE NÀY sau khi debug xong!
 */
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/onedrive';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const results: Record<string, any> = {};

  // 1. Kiểm tra env vars
  results.env = {
    hasClientId:      !!process.env.ONEDRIVE_CLIENT_ID,
    hasTenantId:      !!process.env.ONEDRIVE_TENANT_ID,
    hasRefreshToken:  !!process.env.ONEDRIVE_REFRESH_TOKEN,
    refreshTokenLen:  process.env.ONEDRIVE_REFRESH_TOKEN?.length || 0,
    hasServiceKey:    !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasSupabaseUrl:   !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  };

  // 2. Kiểm tra bảng settings trong Supabase
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { data, error } = await supabase
      .from('settings')
      .select('key, updated_at')
      .eq('key', 'onedrive_refresh_token')
      .single();

    results.supabase_settings = error
      ? { error: error.message, code: error.code }
      : { found: !!data, updated_at: data?.updated_at };
  } catch (e: any) {
    results.supabase_settings = { exception: e.message };
  }

  // 3. Thử lấy Access Token từ Microsoft
  try {
    const token = await getAccessToken();
    results.access_token = {
      success: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
    };
  } catch (e: any) {
    results.access_token = { exception: e.message };
  }

  // 4. Nếu có token → thử list files trong App_Uploads
  if (results.access_token?.success) {
    try {
      const token = await getAccessToken();
      const res = await fetch(
        'https://graph.microsoft.com/v1.0/me/drive/root:/App_Uploads:/children?$top=3',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      results.onedrive_files = res.ok
        ? { count: data.value?.length, files: data.value?.map((f: any) => f.name) }
        : { error: data.error?.message || data };
    } catch (e: any) {
      results.onedrive_files = { exception: e.message };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
