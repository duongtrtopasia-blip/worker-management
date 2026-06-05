const ExcelJS = require('exceljs');

async function createTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Nhập Dữ Liệu');

  sheet.columns = [
    { header: 'Họ và tên (*)', key: 'full_name', width: 25 },
    { header: 'Mã nhân viên - MNV (*)', key: 'employee_id', width: 20 },
    { header: 'Số CCCD (*)', key: 'cccd', width: 20 },
    { header: 'Ngày tháng năm sinh', key: 'dob', width: 20 },
    { header: 'Giới tính', key: 'gender', width: 15 },
    { header: 'Số điện thoại', key: 'phone', width: 15 },
    { header: 'Địa chỉ thường trú', key: 'address', width: 40 },
    { header: 'Tổ đội (*)', key: 'team', width: 20 },
    { header: 'Khu vực (*)', key: 'area', width: 20 },
    { header: 'Chức vụ / Nghề', key: 'position', width: 20 },
    { header: 'Ngày vào làm', key: 'start_date', width: 20 },
    { header: 'Tình trạng làm việc', key: 'status', width: 20 },
    { header: 'Biển số xe', key: 'vehicle_plate', width: 15 },
    { header: 'Loại xe', key: 'vehicle_type', width: 15 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  sheet.addRow({
    full_name: 'Nguyễn Văn A',
    employee_id: 'NV001',
    cccd: '012345678901',
    dob: '01/01/1990',
    gender: 'Nam',
    phone: '0901234567',
    address: 'Hà Nội',
    team: 'Tổ 1',
    area: 'Khu A',
    position: 'Công nhân',
    start_date: '01/06/2026',
    status: 'Đang làm',
    vehicle_plate: '29A-12345',
    vehicle_type: 'Xe máy',
  });

  const guideSheet = workbook.addWorksheet('Hướng Dẫn');
  guideSheet.columns = [
    { header: 'Trường', key: 'field', width: 25 },
    { header: 'Bắt buộc', key: 'required', width: 15 },
    { header: 'Giải thích', key: 'desc', width: 60 }
  ];
  guideSheet.getRow(1).font = { bold: true };
  guideSheet.addRows([
    { field: 'Họ và tên (*)', required: 'Có', desc: 'Họ và tên đầy đủ của công nhân' },
    { field: 'Mã nhân viên - MNV (*)', required: 'Có', desc: 'Mã số nhân viên (duy nhất)' },
    { field: 'Số CCCD (*)', required: 'Có', desc: 'Gồm đúng 12 chữ số' },
    { field: 'Ngày tháng năm sinh', required: 'Không', desc: 'Định dạng DD/MM/YYYY' },
    { field: 'Giới tính', required: 'Không', desc: 'Nam hoặc Nữ' },
    { field: 'Số điện thoại', required: 'Không', desc: 'Số điện thoại liên hệ' },
    { field: 'Địa chỉ thường trú', required: 'Không', desc: 'Địa chỉ thường trú trên CCCD' },
    { field: 'Tổ đội (*)', required: 'Có', desc: 'Tên tổ đội' },
    { field: 'Khu vực (*)', required: 'Có', desc: 'Tên khu vực làm việc' },
    { field: 'Chức vụ / Nghề', required: 'Không', desc: 'Chức danh công việc' },
    { field: 'Ngày vào làm', required: 'Không', desc: 'Định dạng DD/MM/YYYY' },
    { field: 'Tình trạng làm việc', required: 'Không', desc: 'VD: Đang làm, Nghỉ việc...' },
  ]);

  await workbook.xlsx.writeFile('public/Mau_Nhap_Cong_Nhan.xlsx');
  console.log('Template generated!');
}

createTemplate();
