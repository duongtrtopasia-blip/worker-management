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
        .select('id, full_name, cccd, position, team, area, vehicle_type, vehicle_plate')
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
          .select('id, full_name, cccd, position, team, area, vehicle_type, vehicle_plate')
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

    // Add general headers
    worksheet.mergeCells('A1:I1');
    worksheet.getCell('A1').value = 'DANH SÁCH ĐỀ NGHỊ CẤP THẺ RA VÀO / THẺ XE';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Set columns width
    worksheet.columns = [
      { key: 'stt', width: 6 },
      { key: 'name', width: 25 },
      { key: 'cccd', width: 20 },
      { key: 'position', width: 20 },
      { key: 'team', width: 20 },
      { key: 'area', width: 15 },
      { key: 'vehicle_type', width: 15 },
      { key: 'vehicle_plate', width: 20 },
      { key: 'note', width: 20 },
    ];

    // Header Row
    worksheet.getRow(3).values = ['STT', 'HỌ VÀ TÊN', 'SỐ CCCD', 'CHỨC DANH', 'TỔ ĐỘI/NHÀ THẦU', 'KHU VỰC', 'LOẠI XE', 'BIỂN SỐ XE', 'GHI CHÚ'];
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(3).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    
    // Style headers
    worksheet.getRow(3).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // Add Data
    for (let i = 0; i < finalWorkers.length; i++) {
      const w = finalWorkers[i];
      const row = worksheet.addRow({
        stt: i + 1,
        name: w.full_name || '',
        cccd: w.cccd || '',
        position: w.position || '',
        team: w.team || '',
        area: w.area || '',
        vehicle_type: w.vehicle_type || '',
        vehicle_plate: w.vehicle_plate || '',
        note: ''
      });
      
      row.height = 30;
      
      // Add borders and alignment
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'left' : 'center', wrapText: true };
      });
    }

    // Add Approval Signatures Section
    const sigRowIndex = finalWorkers.length + 6;
    
    worksheet.mergeCells(`A${sigRowIndex}:C${sigRowIndex}`);
    worksheet.getCell(`A${sigRowIndex}`).value = 'ĐẠI DIỆN BQLXD';
    worksheet.getCell(`A${sigRowIndex}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${sigRowIndex}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`D${sigRowIndex}:F${sigRowIndex}`);
    worksheet.getCell(`D${sigRowIndex}`).value = 'ĐẠI DIỆN BPAN';
    worksheet.getCell(`D${sigRowIndex}`).font = { bold: true, size: 12 };
    worksheet.getCell(`D${sigRowIndex}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`G${sigRowIndex}:I${sigRowIndex}`);
    worksheet.getCell(`G${sigRowIndex}`).value = 'ĐẠI DIỆN NHÀ THẦU';
    worksheet.getCell(`G${sigRowIndex}`).font = { bold: true, size: 12 };
    worksheet.getCell(`G${sigRowIndex}`).alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="DanhSachPheDuyet_${format(new Date(), 'yyyyMMdd')}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Export Excel Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
