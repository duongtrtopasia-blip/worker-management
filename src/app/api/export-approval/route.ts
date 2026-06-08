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

    // Fetch workers with pagination to bypass 1000-row limit if no specific IDs are provided
    let finalWorkers: any[] = [];

    if (workerIds.length > 0) {
      // Specific workers selected
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name, cccd, position, team, area, vehicle_type, vehicle_plate, date_of_birth, mnv')
        .in('id', workerIds)
        .order('full_name', { ascending: true });
      if (error) throw new Error(`DB error: ${error.message}`);
      finalWorkers = data || [];
    } else {
      // All active workers
      let from = 0;
      const step = 1000;
      while (true) {
        const { data: chunk, error } = await supabase
          .from('workers')
          .select('id, full_name, cccd, position, team, area, vehicle_type, vehicle_plate, date_of_birth, mnv')
          .eq('work_status', 'active')
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
    const worksheet = workbook.addWorksheet('Danh sach xin phe duyet');

    worksheet.views = [{ showGridLines: false }];

    // Set columns width
    worksheet.columns = [
      { key: 'stt', width: 6 },
      { key: 'name', width: 30 },
      { key: 'yob', width: 22 },
      { key: 'cccd', width: 20 },
      { key: 'card_number', width: 20 },
      { key: 'vehicle_plate', width: 20 },
      { key: 'position', width: 15 },
    ];

    // Project and Company Name (Row 1, 2)
    worksheet.mergeCells('C1:G1');
    worksheet.getCell('C1').value = 'DỰ ÁN: KHU DU LỊCH NGHỈ DƯỠNG MỸ LÂM - TUYÊN QUANG';
    worksheet.getCell('C1').font = { bold: true, size: 12, color: { argb: 'FF002060' } };
    worksheet.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('C2:G2');
    worksheet.getCell('C2').value = 'CÔNG TY CP PT VÀ ĐẦU TƯ XÂY DỰNG VINCONS';
    worksheet.getCell('C2').font = { bold: true, size: 12, color: { argb: 'FF002060' } };
    worksheet.getCell('C2').alignment = { horizontal: 'center', vertical: 'middle' };

    // Form title (Row 3, 4)
    worksheet.mergeCells('C3:G3');
    worksheet.getCell('C3').value = 'GIẤY ĐỀ NGHỊ CẤP THẺ XE RA/VÀO DỰ ÁN';
    worksheet.getCell('C3').font = { bold: true, size: 12 };
    worksheet.getCell('C3').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('C4:G4');
    worksheet.getCell('C4').value = 'Kính gửi: BAN QLXD VINHOMES MỸ LÂM - TUYÊN QUANG';
    worksheet.getCell('C4').font = { bold: true, size: 12 };
    worksheet.getCell('C4').alignment = { horizontal: 'center', vertical: 'middle' };

    // Info (Row 6)
    const todayStr = format(new Date(), 'dd.MM.yyyy');
    worksheet.mergeCells('A6:G6');
    worksheet.getCell('A6').value = `Họ và tên: Trần Văn Dương     Chức vụ: CV.ATLĐ     SĐT: 083.735.5678               Từ: ${todayStr}   Thời hạn: 6 tháng`;
    worksheet.getCell('A6').font = { size: 11 };
    worksheet.getCell('A6').alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Apply bold to specific parts using rich text
    worksheet.getCell('A6').value = {
      richText: [
        { text: 'Họ và tên: ', font: { size: 11 } },
        { text: 'Trần Văn Dương     ', font: { size: 11, bold: true } },
        { text: 'Chức vụ: CV.ATLĐ     SĐT: 083.735.5678               ', font: { size: 11 } },
        { text: `Từ: ${todayStr}   Thời hạn: 6 tháng`, font: { size: 11 } }
      ]
    };

    // Category (Row 7)
    worksheet.mergeCells('A7:G7');
    worksheet.getCell('A7').value = 'Hạng mục thi công: Dự án Mỹ Lâm - Tuyên Quang';
    worksheet.getCell('A7').font = { size: 11 };
    worksheet.getCell('A7').alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Bottom border for Row 7
    worksheet.getCell('A7').border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } };

    // Subtitle (Row 8)
    worksheet.mergeCells('A8:G8');
    worksheet.getCell('A8').value = 'DANH SÁCH ĐỀ NGHỊ CẤP THẺ XE';
    worksheet.getCell('A8').font = { bold: true, size: 12, underline: 'single', color: { argb: 'FF002060' } };
    worksheet.getCell('A8').alignment = { horizontal: 'center', vertical: 'middle' };

    // Table Header (Row 10)
    worksheet.getRow(10).values = ['TT', 'HỌ VÀ TÊN', 'NGÀY THÁNG NĂM SINH', 'CCCD', 'SỐ THẺ', 'BIỂN KIỂM SOÁT', 'CHỨC DANH'];
    worksheet.getRow(10).height = 25;
    worksheet.getRow(10).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002B49' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      };
    });

    // Add Data
    for (let i = 0; i < finalWorkers.length; i++) {
      const w = finalWorkers[i];
      let yob = '';
      if (w.date_of_birth) {
        // convert YYYY-MM-DD to DD/MM/YYYY safely
        const parts = w.date_of_birth.split('-');
        if (parts.length === 3) {
          yob = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          yob = w.date_of_birth;
        }
      }
      
      const cardNumber = w.mnv ? `VCS-${w.mnv}` : '';

      const row = worksheet.addRow({
        stt: i + 1,
        name: w.full_name || '',
        yob: yob,
        cccd: w.cccd || '',
        card_number: cardNumber,
        vehicle_plate: w.vehicle_plate || '',
        position: w.position || 'CNCH'
      });
      
      row.height = 25;
      
      // Add borders and alignment
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'left' : 'center' };
      });
      
      // Font settings for each column based on image
      row.getCell(1).font = { bold: true, color: { argb: 'FF333333' } }; // TT
      row.getCell(2).font = { bold: true, color: { argb: 'FF111111' } }; // HỌ VÀ TÊN
      row.getCell(3).font = { bold: false, color: { argb: 'FF555555' } }; // NĂM SINH
      row.getCell(4).font = { bold: false, color: { argb: 'FF555555' } }; // CCCD
      row.getCell(5).font = { bold: true, color: { argb: 'FF333333' } }; // SỐ THẺ
      row.getCell(6).font = { bold: true, color: { argb: 'FF333333' } }; // BIỂN KIỂM SOÁT
      row.getCell(7).font = { bold: true, color: { argb: 'FF555555' } }; // CHỨC DANH
    }

    // Add Approval Signatures Section
    const sigRowIndex = finalWorkers.length + 13;
    
    worksheet.mergeCells(`A${sigRowIndex}:B${sigRowIndex}`);
    worksheet.getCell(`A${sigRowIndex}`).value = 'ĐẠI DIỆN BQLXD';
    worksheet.getCell(`A${sigRowIndex}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${sigRowIndex}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`C${sigRowIndex}:D${sigRowIndex}`);
    worksheet.getCell(`C${sigRowIndex}`).value = 'ĐẠI DIỆN BPAN';
    worksheet.getCell(`C${sigRowIndex}`).font = { bold: true, size: 12 };
    worksheet.getCell(`C${sigRowIndex}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`E${sigRowIndex}:F${sigRowIndex}`);
    worksheet.getCell(`E${sigRowIndex}`).value = 'ĐẠI DIỆN NHÀ THẦU';
    worksheet.getCell(`E${sigRowIndex}`).font = { bold: true, size: 12 };
    worksheet.getCell(`E${sigRowIndex}`).alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="DanhSachPheDuyetTheXe_${format(new Date(), 'yyyyMMdd')}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Export Excel Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
