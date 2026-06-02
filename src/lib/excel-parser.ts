import * as XLSX from 'xlsx';
import { z } from 'zod';
import { Worker } from '@/types';

// Zod Schema để validate từng dòng
const workerRowSchema = z.object({
  STT: z.any().optional(),
  'Họ và tên': z.string().min(2, 'Tên quá ngắn').max(100, 'Tên quá dài'),
  'Mã nhân viên (MNV)': z.string().min(3, 'MNV quá ngắn'),
  'Số CCCD': z.string().length(12, 'CCCD phải đủ 12 số').regex(/^\d+$/, 'CCCD chỉ chứa số'),
  'Ngày sinh (DD/MM/YYYY)': z.string().optional(),
  'Giới tính (Nam/Nữ)': z.enum(['Nam', 'Nữ', 'Khác']).optional().catch('Nam'),
  'Số điện thoại': z.string().optional(),
  'Địa chỉ': z.string().optional(),
  'Tổ đội': z.string().min(1, 'Thiếu Tổ đội'),
  'Khu vực làm việc': z.string().min(1, 'Thiếu Khu vực'),
  'Chức vụ': z.string().optional(),
  'Ngày vào làm (DD/MM/YYYY)': z.string().optional(),
  'Ghi chú': z.string().optional()
});

export type ParseResult = {
  totalRows: number;
  validWorkers: Worker[];
  errors: { row: number; errors: string[] }[];
};

export async function parseWorkersExcel(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Parse từ dòng thứ 3 (vì dòng 1 là Header, dòng 2 là Hướng dẫn)
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { range: 2 });
  
  const validWorkers: Worker[] = [];
  const errors: { row: number; errors: string[] }[] = [];

  rawData.forEach((row, index) => {
    // Dòng Excel thực tế = index + 3 (do skip 2 dòng đầu)
    const rowNumber = index + 3;
    
    // Nếu dòng trống (không có tên hoặc MNV) thì skip
    if (!row['Họ và tên'] && !row['Mã nhân viên (MNV)']) return;

    const validation = workerRowSchema.safeParse(row);
    
    if (validation.success) {
      const data = validation.data;
      
      // Chuyển đổi định dạng ngày DD/MM/YYYY -> YYYY-MM-DD
      const parseDate = (d?: string) => {
        if (!d) return undefined;
        const parts = d.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return undefined;
      };

      validWorkers.push({
        full_name: data['Họ và tên'],
        employee_id: data['Mã nhân viên (MNV)'],
        cccd_number: data['Số CCCD'],
        date_of_birth: parseDate(data['Ngày sinh (DD/MM/YYYY)']),
        gender: data['Giới tính (Nam/Nữ)'],
        phone: data['Số điện thoại']?.toString(),
        address: data['Địa chỉ'],
        team_name: data['Tổ đội'],
        work_area: data['Khu vực làm việc'],
        position: data['Chức vụ'],
        start_date: parseDate(data['Ngày vào làm (DD/MM/YYYY)']),
        notes: data['Ghi chú'],
        status: 'active'
      });
    } else {
      errors.push({
        row: rowNumber,
        errors: validation.error.errors.map(err => err.message)
      });
    }
  });

  return {
    totalRows: validWorkers.length + errors.length,
    validWorkers,
    errors
  };
}
