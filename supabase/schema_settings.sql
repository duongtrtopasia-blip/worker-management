-- ============================================================
-- MIGRATION: Tạo bảng settings
-- Mục đích: Lưu cấu hình hệ thống, đặc biệt là OneDrive
--           refresh token (tự động cập nhật hàng ngày bởi cron)
--
-- Hướng dẫn: Copy toàn bộ script này, paste vào
--   Supabase Dashboard → SQL Editor → New query → Run (F5)
-- ============================================================


-- =====================
-- BẢNG: settings
-- =====================
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,               -- Tên cấu hình (unique key)
  value      TEXT NOT NULL,                  -- Giá trị cấu hình
  description TEXT,                          -- Mô tả (để dễ quản lý)
  is_secret  BOOLEAN DEFAULT TRUE,           -- TRUE = ẩn giá trị trên UI
  updated_at TIMESTAMPTZ DEFAULT NOW()       -- Lần cập nhật cuối
);

-- Comment mô tả bảng
COMMENT ON TABLE settings
  IS 'Bảng lưu cấu hình hệ thống — chỉ server (service_role) được đọc/ghi';
COMMENT ON COLUMN settings.key
  IS 'Tên cấu hình duy nhất, ví dụ: onedrive_refresh_token';
COMMENT ON COLUMN settings.value
  IS 'Giá trị cấu hình (plain text, lưu token/secret)';
COMMENT ON COLUMN settings.description
  IS 'Mô tả ngắn về cấu hình này để dễ quản lý';
COMMENT ON COLUMN settings.is_secret
  IS 'TRUE = không hiển thị giá trị trên giao diện admin';
COMMENT ON COLUMN settings.updated_at
  IS 'Timestamp tự động cập nhật mỗi khi row thay đổi';


-- =====================
-- TRIGGER: tự động cập nhật updated_at khi có thay đổi
-- =====================
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();


-- =====================
-- ROW LEVEL SECURITY (RLS)
-- Chặn toàn bộ truy cập từ client (anon/authenticated)
-- Chỉ service_role (server-side Next.js) mới được phép
-- =====================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Không cho phép bất kỳ role public nào đọc/ghi
DROP POLICY IF EXISTS "No public access to settings" ON settings;
CREATE POLICY "No public access to settings"
  ON settings FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- authenticated role cũng không được phép (chỉ service_role bypass RLS)
DROP POLICY IF EXISTS "No authenticated access to settings" ON settings;
CREATE POLICY "No authenticated access to settings"
  ON settings FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);


-- =====================
-- INDEX để truy vấn nhanh theo key
-- =====================
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);


-- =====================
-- SEED DATA: Thêm refresh token OneDrive lần đầu
--
-- ⚠️  QUAN TRỌNG: Thay đoạn 'PASTE_REFRESH_TOKEN_TỪ_ENV_LOCAL_Ở_ĐÂY'
--     bằng giá trị ONEDRIVE_REFRESH_TOKEN trong file .env.local của bạn
-- =====================
INSERT INTO settings (key, value, description, is_secret, updated_at)
VALUES (
  'onedrive_refresh_token',
  'PASTE_REFRESH_TOKEN_TỪ_ENV_LOCAL_Ở_ĐÂY',
  'OneDrive OAuth2 Refresh Token — tự động cập nhật bởi cron /api/cron/refresh-onedrive-token chạy lúc 02:00 (GMT+7) hàng ngày',
  TRUE,
  NOW()
)
ON CONFLICT (key)
  DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = NOW();


-- =====================
-- KIỂM TRA KẾT QUẢ
-- Chạy lệnh này để xác nhận bảng và dữ liệu đã được tạo thành công
-- =====================
SELECT
  key,
  LEFT(value, 30) || '...' AS value_preview,  -- Chỉ hiển thị 30 ký tự đầu
  description,
  is_secret,
  updated_at
FROM settings
ORDER BY key;
