-- =====================
-- BẢNG 1: workers (hồ sơ công nhân)
-- =====================
CREATE TABLE workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id VARCHAR(20) UNIQUE NOT NULL,        -- Mã nhân viên (MNV)
  full_name VARCHAR(100) NOT NULL,                -- Họ và tên
  cccd_number VARCHAR(12) UNIQUE NOT NULL,        -- Số CCCD
  date_of_birth DATE,
  gender VARCHAR(10),
  phone VARCHAR(15),
  address TEXT,
  team_name VARCHAR(100),                         -- Tên tổ đội
  work_area VARCHAR(100),                         -- Khu vực làm việc
  position VARCHAR(100),                          -- Chức vụ/nghề nghiệp
  start_date DATE,
  status VARCHAR(20) DEFAULT 'active',            -- active/inactive/suspended
  portrait_url TEXT,                              -- URL ảnh chân dung (Google Drive)
  portrait_drive_id VARCHAR(255),                 -- Google Drive file ID của ảnh
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- BẢNG 2: access_cards (thẻ ra vào)
-- =====================
CREATE TABLE access_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL,                 -- 'person' hoặc 'vehicle'
  card_number VARCHAR(50) UNIQUE NOT NULL,        -- Số thẻ
  vehicle_plate VARCHAR(20),                      -- Biển số xe (nếu là thẻ xe)
  vehicle_type VARCHAR(50),                       -- Loại xe (xe máy, ô tô...)
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  qr_data TEXT,                                   -- JSON data mã hóa trong QR
  qr_image_url TEXT,                              -- URL ảnh QR (Google Drive)
  qr_drive_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- BẢNG 3: documents (tài liệu hồ sơ)
-- =====================
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,
  -- Các loại: 'health_certificate' | 'cccd_notarized' | 'safety_card' 
  --           | 'safety_test' | 'safety_commitment' | 'other'
  doc_name VARCHAR(255) NOT NULL,                 -- Tên file hiển thị
  file_url TEXT NOT NULL,                         -- URL xem file (Google Drive)
  drive_file_id VARCHAR(255) NOT NULL,            -- Google Drive file ID
  drive_folder_id VARCHAR(255),                   -- Thư mục chứa file
  file_size BIGINT,                               -- Bytes
  issue_date DATE,                                -- Ngày cấp
  expiry_date DATE,                               -- Ngày hết hạn (nếu có)
  status VARCHAR(20) DEFAULT 'valid',             -- valid/expired/pending
  uploaded_by UUID,                               -- User ID người upload
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- =====================
-- BẢNG 4: document_status (tình trạng hồ sơ tổng hợp)
-- =====================
CREATE TABLE document_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE UNIQUE,
  health_certificate BOOLEAN DEFAULT FALSE,
  health_certificate_expiry DATE,
  cccd_notarized BOOLEAN DEFAULT FALSE,
  safety_card BOOLEAN DEFAULT FALSE,
  safety_card_expiry DATE,
  safety_test BOOLEAN DEFAULT FALSE,
  safety_test_score NUMERIC(5,2),
  safety_commitment BOOLEAN DEFAULT FALSE,
  overall_status VARCHAR(20) DEFAULT 'incomplete',
  -- complete / incomplete / expired
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- BẢNG 5: import_logs (lịch sử import)
-- =====================
CREATE TABLE import_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name VARCHAR(255),
  total_rows INTEGER,
  success_rows INTEGER,
  failed_rows INTEGER,
  errors JSONB,
  imported_by UUID,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX idx_workers_employee_id ON workers(employee_id);
CREATE INDEX idx_workers_team ON workers(team_name);
CREATE INDEX idx_workers_area ON workers(work_area);
CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_access_cards_worker ON access_cards(worker_id);
CREATE INDEX idx_documents_worker ON documents(worker_id);
CREATE INDEX idx_documents_type ON documents(doc_type);
CREATE INDEX idx_doc_status_worker ON document_status(worker_id);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_status ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read all
CREATE POLICY "Authenticated read" ON workers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON access_cards FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON documents FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated read" ON document_status FOR SELECT TO authenticated USING (TRUE);

-- Policy: only admin can write
CREATE POLICY "Admin write workers" ON workers FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- =====================
-- TRIGGER: tự động cập nhật updated_at
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workers_updated_at BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================  
-- TRIGGER: tự động tạo document_status khi có worker mới
-- =====================
CREATE OR REPLACE FUNCTION create_doc_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO document_status(worker_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_doc_status AFTER INSERT ON workers
  FOR EACH ROW EXECUTE FUNCTION create_doc_status();
