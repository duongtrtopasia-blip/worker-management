-- Migration: Tạo bảng settings để lưu cấu hình hệ thống
-- Bao gồm: OneDrive refresh token (tự động cập nhật hàng ngày)
--
-- Chạy script này trong Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm comment để dễ quản lý
COMMENT ON TABLE settings IS 'Bảng lưu cấu hình hệ thống, bao gồm OneDrive refresh token';
COMMENT ON COLUMN settings.key IS 'Tên cấu hình (ví dụ: onedrive_refresh_token)';
COMMENT ON COLUMN settings.value IS 'Giá trị cấu hình';
COMMENT ON COLUMN settings.updated_at IS 'Thời điểm cập nhật cuối';

-- Bảo mật: chỉ cho phép server-side (service role) đọc/ghi
-- Không cho client truy cập trực tiếp
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: service_role bypass RLS (mặc định), client không có quyền
CREATE POLICY "No public access to settings"
  ON settings FOR ALL
  TO public
  USING (false);

-- Seed: Chèn refresh token từ .env vào Supabase lần đầu
-- (Thay YOUR_REFRESH_TOKEN bằng giá trị từ .env.local -> ONEDRIVE_REFRESH_TOKEN)
-- INSERT INTO settings (key, value, updated_at)
-- VALUES ('onedrive_refresh_token', 'YOUR_REFRESH_TOKEN', NOW())
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
