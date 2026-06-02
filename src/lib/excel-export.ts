import * as XLSX from 'xlsx';

/**
 * Xuất dữ liệu JSON ra file Excel và tải xuống
 * @param data Mảng các object dữ liệu cần xuất
 * @param fileName Tên file (không bao gồm .xlsx)
 */
export function exportToExcel(data: any[], fileName: string) {
  // Tạo workbook và worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Tự động điều chỉnh độ rộng cột cơ bản
  const max_width = data.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
  worksheet['!cols'] = Array(max_width).fill({ wch: 20 });

  // Sinh buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Blob download
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  
  // Fake thẻ <a> để tải file
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  
  // Cleanup
  window.URL.revokeObjectURL(url);
}
