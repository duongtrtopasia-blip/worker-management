-- =====================
-- BẢNG: audit_logs (lịch sử hoạt động)
-- =====================
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL,               -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'SCAN'
  entity_type VARCHAR(50) NOT NULL,               -- 'worker', 'access_card', 'document', 'system'
  entity_id UUID,                                 -- ID của đối tượng bị thay đổi
  user_id UUID REFERENCES auth.users(id),         -- Người thực hiện (nếu có)
  changes JSONB,                                  -- Lưu dữ liệu cũ/mới nếu cần
  description TEXT,                               -- Mô tả tóm tắt hành động
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45)                          -- Địa chỉ IP thực hiện
);

-- Indexes
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action_type);

-- Policy (Chỉ Admin mới được xem log, hoặc ai được phân quyền)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read logs" ON audit_logs FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
-- Có thể cho phép service_role write tự do
