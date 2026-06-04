/**
 * Debug endpoint — kiểm tra kết nối OneDrive + raw Microsoft error
 * Truy cập: /api/test-onedrive
 * XÓA FILE NÀY sau khi debug xong!
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const results: Record<string, any> = {};

  // 1. Kiểm tra env vars
  const clientId      = process.env.ONEDRIVE_CLIENT_ID || '';
  const tenantId      = process.env.ONEDRIVE_TENANT_ID || 'common';
  const envToken      = process.env.ONEDRIVE_REFRESH_TOKEN || '';

  results.env = {
    hasClientId:     !!clientId,
    hasTenantId:     !!tenantId,
    hasRefreshToken: !!envToken,
    refreshTokenLen: envToken.length,
    hasServiceKey:   !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  // 2. Lấy refresh token từ Supabase
  let refreshToken = envToken;
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { data, error } = await supabase
      .from('settings')
      .select('key, value, updated_at')
      .eq('key', 'onedrive_refresh_token')
      .single();

    if (data?.value) {
      refreshToken = data.value;
      results.supabase_settings = {
        found: true,
        updated_at: data.updated_at,
        tokenLen: data.value.length,
        tokenPreview: data.value.substring(0, 30) + '...',
      };
    } else {
      results.supabase_settings = { found: false, error: error?.message };
    }
  } catch (e: any) {
    results.supabase_settings = { exception: e.message };
  }

  // 3. Gọi trực tiếp Microsoft token endpoint — hiện RAW response
  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('scope', 'Files.ReadWrite offline_access User.Read');

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const msData = await res.json();

    results.microsoft_raw = {
      status: res.status,
      ok: res.ok,
      // Nếu thành công
      hasAccessToken: !!msData.access_token,
      hasNewRefreshToken: !!msData.refresh_token,
      // Nếu thất bại — hiện lỗi đầy đủ
      error: msData.error || null,
      error_description: msData.error_description || null,
      error_codes: msData.error_codes || null,
    };
  } catch (e: any) {
    results.microsoft_raw = { exception: e.message };
  }

  return NextResponse.json(results, { status: 200 });
}
