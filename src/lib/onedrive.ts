/**
 * OneDrive Integration — với Rotating Refresh Token
 *
 * Vấn đề cũ: Refresh token lưu trong .env bị hết hạn vì Microsoft
 * cấp refresh token MỚI mỗi lần refresh, code cũ bỏ qua token mới đó.
 *
 * Giải pháp: Lưu refresh token vào bảng `settings` trong Supabase,
 * mỗi lần dùng sẽ tự động cập nhật token mới nhất.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Dùng service role key để có quyền đọc/ghi bảng settings
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: {
    fetch: (url, options) => {
      return fetch(url, { ...options, cache: 'no-store' });
    }
  }
});

const SETTINGS_KEY = 'onedrive_refresh_token';

/**
 * Lấy refresh token hiện tại từ Supabase.
 * Ưu tiên: Supabase > .env (fallback lần đầu)
 */
async function getRefreshToken(): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();

    if (data?.value) return data.value;
  } catch {
    // Bảng settings chưa có hoặc lỗi → dùng .env
  }

  // Fallback: dùng refresh token từ .env (lần khởi động đầu tiên)
  return process.env.ONEDRIVE_REFRESH_TOKEN || '';
}

/**
 * Lưu refresh token mới vào Supabase (upsert)
 */
async function saveRefreshToken(newToken: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('settings')
      .upsert(
        { key: SETTINGS_KEY, value: newToken, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
  } catch (err) {
    console.error('[OneDrive] Không thể lưu refresh token mới:', err);
  }
}

// ── In-memory Access Token Cache ──────────────────────────────────────────────
// Access token Microsoft có hiệu lực 3600s (60 phút). Cache 55 phút để an toàn.
let _cachedAccessToken: string | null = null;
let _tokenExpiresAt: number = 0; // Unix timestamp (ms)
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 phút

/**
 * Lấy Access Token từ Microsoft.
 * Tự động cập nhật refresh token mới sau mỗi lần gọi thành công.
 * Cache token trong memory để tránh gọi lại Microsoft khi chưa hết hạn.
 */
export async function getAccessToken(): Promise<string | null> {
  // ✅ Trả về token đã cache nếu còn hiệu lực
  if (_cachedAccessToken && Date.now() < _tokenExpiresAt) {
    return _cachedAccessToken;
  }

  const tenantId = process.env.ONEDRIVE_TENANT_ID || 'common';
  const clientId = process.env.ONEDRIVE_CLIENT_ID || '';
  const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET || '';
  const refreshToken = await getRefreshToken();

  if (!refreshToken || !clientId) {
    console.error('[OneDrive] Thiếu credentials: ONEDRIVE_CLIENT_ID hoặc refresh token chưa được cấu hình.');
    return null;
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  // scope bắt buộc phải có — thiếu field này là 1 trong các lý do token bị lỗi
  params.append('scope', 'Files.ReadWrite offline_access User.Read');

  if (clientSecret) {
    params.append('client_secret', clientSecret);
  }

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[OneDrive] Lỗi refresh token:', data.error, '-', data.error_description);
      _cachedAccessToken = null;
      _tokenExpiresAt = 0;
      return null;
    }

    // ✅ Quan trọng: Microsoft trả về refresh_token MỚI mỗi lần → phải lưu lại
    if (data.refresh_token && data.refresh_token !== refreshToken) {
      await saveRefreshToken(data.refresh_token);
      console.log('[OneDrive] Đã cập nhật refresh token mới vào Supabase.');
    }

    // ✅ Cache access token trong memory
    _cachedAccessToken = data.access_token;
    _tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
    console.log('[OneDrive] Access token mới được cache, hết hạn sau 55 phút.');

    return data.access_token;
  } catch (error) {
    console.error('[OneDrive] Lỗi kết nối Microsoft:', error);
    return null;
  }
}

/**
 * Upload file lên OneDrive — App_Uploads folder
 * Trả về đường dẫn proxy nội bộ để hiển thị ảnh.
 */
export async function uploadToOneDrive(file: File): Promise<string> {
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('[OneDrive] Không lấy được access token, bỏ qua upload.');
      return '';
    }

    // Đặt tên file unique để tránh ghi đè
    const ext = file.name.split('.').pop() || 'jpg';
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const fileName = `${baseName}_${Date.now()}.${ext}`;

    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/App_Uploads/${fileName}:/content`;
    const arrayBuffer = await file.arrayBuffer();

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[OneDrive] Upload thất bại:', errText);
      return '';
    }

    const result = await response.json();
    console.log('[OneDrive] Upload thành công:', fileName);

    // Trả về đường dẫn proxy nội bộ (route /api/proxy-image/[filename])
    return `/api/proxy-image/${encodeURIComponent(fileName)}`;
  } catch (error) {
    console.error('[OneDrive] Lỗi không xác định khi upload:', error);
    return '';
  }
}
