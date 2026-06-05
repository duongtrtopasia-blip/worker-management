import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const workerIds: string[] = body.workerIds || [];

    // Fetch workers with pagination to bypass 1000-row limit
    let finalWorkers: any[] = [];

    if (workerIds.length > 0) {
      // Specific workers selected
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name, gender, date_of_birth, cccd, address, position, area, card_status, portrait_url, work_status')
        .in('id', workerIds)
        .order('full_name', { ascending: true });
      if (error) throw new Error(`DB error: ${error.message}`);
      finalWorkers = data || [];
    } else {
      // All active workers not yet issued a card
      let from = 0;
      const step = 1000;
      while (true) {
        const { data: chunk, error } = await supabase
          .from('workers')
          .select('id, full_name, gender, date_of_birth, cccd, address, position, area, card_status, portrait_url, work_status')
          .eq('work_status', 'active')
          .neq('card_status', 'issued')
          .order('full_name', { ascending: true })
          .range(from, from + step - 1);
        if (error) throw new Error(`DB error: ${error.message}`);
        if (!chunk || chunk.length === 0) break;
        finalWorkers = finalWorkers.concat(chunk);
        if (chunk.length < step) break;
        from += step;
      }
    }

    // Initialize ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sach huan luyen');

    // Add general headers
    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').value = 'CÔNG TY CỔ PHẦN PHÁT TRIỂN VÀ ĐẦU TƯ XÂY DỰNG VINCONS';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    
    worksheet.mergeCells('A2:J2');
    worksheet.getCell('A2').value = 'DANH SÁCH THAM DỰ HUẤN LUYỆN AN TOÀN VỆ SINH LAO ĐỘNG';
    worksheet.getCell('A2').font = { bold: true, size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Set columns width
    worksheet.columns = [
      { key: 'stt', width: 5 },
      { key: 'name', width: 25 },
      { key: 'male', width: 8 },
      { key: 'female', width: 8 },
      { key: 'dob', width: 15 },
      { key: 'cccd', width: 20 },
      { key: 'address', width: 40 },
      { key: 'position', width: 25 },
      { key: 'group', width: 20 },
      { key: 'photo', width: 15 },
    ];

    // Header Row 4 & 5
    worksheet.mergeCells('A4:A5'); worksheet.getCell('A4').value = 'STT\n(1)';
    worksheet.mergeCells('B4:B5'); worksheet.getCell('B4').value = 'HỌ VÀ TÊN\n(2)';
    worksheet.mergeCells('C4:D4'); worksheet.getCell('C4').value = 'GIỚI TÍNH';
    worksheet.getCell('C5').value = 'NAM\n(3)';
    worksheet.getCell('D5').value = 'NỮ\n(4)';
    worksheet.mergeCells('E4:E5'); worksheet.getCell('E4').value = 'NGÀY THÁNG\nNĂM SINH\n(5)';
    worksheet.mergeCells('F4:F5'); worksheet.getCell('F4').value = 'SỐ CCCD\nHỘ CHIẾU\n(6)';
    worksheet.mergeCells('G4:G5'); worksheet.getCell('G4').value = 'ĐỊA CHỈ THƯỜNG TRÚ\n(7)';
    worksheet.mergeCells('H4:H5'); worksheet.getCell('H4').value = 'CHỨC DANH\n(ghi đúng chức danh)\n(8)';
    worksheet.mergeCells('I4:I5'); worksheet.getCell('I4').value = 'HỌC VIÊN\nTHUỘC NHÓM\n(9)';
    worksheet.mergeCells('J4:J5'); worksheet.getCell('J4').value = 'ẢNH LÀM THẺ\n(10)';

    // Style headers
    for (let row = 4; row <= 5; row++) {
      worksheet.getRow(row).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
    }

    // Add Data
    for (let i = 0; i < finalWorkers.length; i++) {
      const w = finalWorkers[i];
      const rowIndex = i + 6;
      
      const dobStr = w.date_of_birth ? format(new Date(w.date_of_birth), 'dd/MM/yyyy') : '';
      const isMale = w.gender === 'Nam' ? 'x' : '';
      const isFemale = w.gender === 'Nữ' ? 'x' : '';
      
      const row = worksheet.addRow({
        stt: i + 1,
        name: w.full_name,
        male: isMale,
        female: isFemale,
        dob: dobStr,
        cccd: w.cccd || w.cccd_number || '',
        address: w.address || '',
        position: w.position || '',
        group: 'Nhóm 3',
        photo: '' // Empty for now, we will add image
      });
      
      row.height = 90;
      
      // Add borders and alignment
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      
      // Download and insert image
      if (w.portrait_url) {
        try {
          // If the URL is from OneDrive proxy or Supabase, download it
          // Handle proxy URL specifically if needed, but fetch usually works
          let imgUrl = w.portrait_url;
          if (imgUrl.startsWith('/api/proxy-image')) {
             // In server environment, relative URLs won't work for fetch
             const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'http://localhost:3000';
             imgUrl = `${baseUrl}${imgUrl}`;
          }
          
          const response = await fetch(imgUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const imageId = workbook.addImage({
              buffer: buffer,
              extension: 'jpeg', // exceljs will auto detect png/jpeg usually
            });
            
            // In exceljs: col 0 is A, row 0 is 1. We are in column J (index 9), row `rowIndex` (0-indexed -> `rowIndex - 1`)
            worksheet.addImage(imageId, {
              tl: { col: 9 + 0.1, row: rowIndex - 1 + 0.1 }, // padding
              ext: { width: 85, height: 110 },
              editAs: 'oneCell'
            });
          }
        } catch (imgError) {
          console.error('Error downloading image for worker', w.id, imgError);
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="DanhSachHL_Nhom3_${format(new Date(), 'yyyyMMdd')}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Export Excel Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
