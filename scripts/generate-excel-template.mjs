/**
 * Script tạo file Excel mẫu nhập hàng loạt công nhân
 * Run: node scripts/generate-excel-template.mjs
 */

import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../public/Mau_Nhap_Cong_Nhan.xlsx');

// ── Định nghĩa cột ──────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'full_name',     header: 'Họ và Tên (*)',           width: 28, note: 'Bắt buộc. VD: Nguyễn Văn An' },
  { key: 'employee_id',   header: 'Mã Nhân Viên - MNV (*)',  width: 22, note: 'Bắt buộc. VD: 6677889' },
  { key: 'cccd',          header: 'Số CCCD (*)',              width: 18, note: 'Bắt buộc. 12 chữ số. VD: 012345678910' },
  { key: 'team',          header: 'Tổ Đội (*)',               width: 22, note: 'Bắt buộc. VD: Tổ thi công 1' },
  { key: 'area',          header: 'Khu Vực (*)',              width: 22, note: 'Bắt buộc. VD: 540ha, Khu A' },
  { key: 'position',      header: 'Chức Vụ / Nghề',          width: 22, note: 'Tùy chọn. VD: Thợ xây, ATLĐ' },
  { key: 'vehicle_plate', header: 'Biển Số Xe',              width: 18, note: 'Tùy chọn. VD: 59X1-123.45' },
  { key: 'vehicle_type',  header: 'Loại Xe',                 width: 16, note: 'Tùy chọn. Xe Máy / Ô tô / Xe Tải / Xe Đạp Điện' },
  { key: 'phone',         header: 'Số Điện Thoại',           width: 18, note: 'Tùy chọn. VD: 0901234567' },
  { key: 'start_date',    header: 'Ngày Vào Làm',            width: 18, note: 'Tùy chọn. Định dạng: DD/MM/YYYY' },
];

// ── Dữ liệu mẫu ─────────────────────────────────────────────────────────────
const SAMPLE_ROWS = [
  {
    full_name: 'Nguyễn Văn An',
    employee_id: '6677889',
    cccd: '012345678901',
    team: 'Tổ thi công 1',
    area: '540ha - Khu A',
    position: 'Thợ xây',
    vehicle_plate: '59X1-123.45',
    vehicle_type: 'Xe Máy',
    phone: '0901234567',
    start_date: '01/06/2025',
  },
  {
    full_name: 'Trần Thị Bình',
    employee_id: '6677890',
    cccd: '012345678902',
    team: 'Tổ hoàn thiện',
    area: '540ha - Khu B',
    position: 'Thợ hàn',
    vehicle_plate: '',
    vehicle_type: '',
    phone: '0912345678',
    start_date: '15/05/2025',
  },
  {
    full_name: 'Lê Quốc Cường',
    employee_id: '6677891',
    cccd: '012345678903',
    team: 'Tổ điện nước',
    area: '540ha - Khu C',
    position: 'Thợ điện',
    vehicle_plate: '51A-999.88',
    vehicle_type: 'Ô tô',
    phone: '0934567890',
    start_date: '20/04/2025',
  },
];

// ── Tạo workbook ─────────────────────────────────────────────────────────────
const wb = XLSX.utils.book_new();

// Sheet 1: Dữ liệu nhập
const headerRow = COLUMNS.map(c => c.header);
const sampleRows = SAMPLE_ROWS.map(row => COLUMNS.map(c => row[c.key] ?? ''));

const wsData = [headerRow, ...sampleRows];
const ws = XLSX.utils.aoa_to_sheet(wsData);

// Set column widths
ws['!cols'] = COLUMNS.map(c => ({ wch: c.width }));

// Freeze top row
ws['!freeze'] = { xSplit: 0, ySplit: 1 };

// Add note row style (row 2+ are sample data - light bg)
// Note: basic xlsx lib supports limited styling via sheetjs-style
// We use cell comments for field notes
COLUMNS.forEach((col, i) => {
  const cellAddr = XLSX.utils.encode_cell({ r: 0, c: i });
  if (!ws[cellAddr]) return;
  ws[cellAddr].c = [{ a: 'System', t: col.note }];
});

// Sheet 2: Hướng dẫn
const guide = [
  ['HƯỚNG DẪN NHẬP DỮ LIỆU CÔNG NHÂN'],
  [''],
  ['📋 QUY TẮC CHUNG'],
  ['1. Xóa các dòng mẫu (dòng 2, 3, 4) trước khi nhập dữ liệu thật'],
  ['2. Giữ nguyên hàng tiêu đề (dòng 1) — không sửa tên cột'],
  ['3. Mỗi dòng là một công nhân'],
  ['4. Các cột có (*) là bắt buộc, phải điền đầy đủ'],
  [''],
  ['📌 CHI TIẾT TỪNG CỘT'],
  ['Cột', 'Bắt buộc', 'Mô tả', 'Ví dụ'],
  ...COLUMNS.map(c => [
    c.header,
    c.note.startsWith('Bắt buộc') ? 'CÓ' : 'Không',
    c.note,
    '',
  ]),
  [''],
  ['⚠️ LƯU Ý QUAN TRỌNG'],
  ['• MNV và CCCD phải là duy nhất trong hệ thống — trùng sẽ bị báo lỗi'],
  ['• CCCD phải đúng 12 chữ số'],
  ['• Loại xe chỉ được nhập một trong các giá trị: Xe Máy, Ô tô, Xe Tải, Xe Đạp Điện'],
  ['• Ngày tháng nhập theo định dạng DD/MM/YYYY (VD: 01/06/2025)'],
  ['• Nếu không có xe, để trống cột Biển Số Xe và Loại Xe'],
  [''],
  ['📞 HỖ TRỢ: Liên hệ bộ phận IT nếu cần trợ giúp'],
];

const wsGuide = XLSX.utils.aoa_to_sheet(guide);
wsGuide['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 55 }, { wch: 20 }];
wsGuide['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

XLSX.utils.book_append_sheet(wb, ws, 'Nhập Dữ Liệu');
XLSX.utils.book_append_sheet(wb, wsGuide, 'Hướng Dẫn');

// Ghi file
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
writeFileSync(OUTPUT_PATH, buf);
console.log(`✅ Đã tạo file: ${OUTPUT_PATH}`);
