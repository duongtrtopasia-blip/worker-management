'use server';

import { sendTelegramMessage } from '@/lib/telegram';
import { supabase } from '@/lib/supabase';

async function uploadToFlaskAPI(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('http://127.0.0.1:5000/upload-onedrive', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Lỗi từ Flask API:', errorText);
      return '';
    }

    const data = await res.json();
    return data.url || '';
  } catch (error) {
    // Flask không chạy → bỏ qua, tiếp tục lưu DB
    console.warn('Flask API không khả dụng, bỏ qua upload ảnh:', error);
    return '';
  }
}

export async function addWorkerAction(formData: FormData) {
  let portraitUrl = '';

  // 1. Upload ảnh qua Flask API (nếu có) — không block nếu Flask offline
  const file = formData.get('portrait') as File;
  if (file && file.size > 0) {
    portraitUrl = await uploadToFlaskAPI(file);
  }

  // 2. Chuẩn bị dữ liệu — lọc bỏ empty string để tránh lỗi constraint
  const vehiclePlate = (formData.get('vehicle_plate') as string)?.trim() || null;
  const vehicleType  = (formData.get('vehicle_type')  as string)?.trim() || null;
  const position     = (formData.get('position')      as string)?.trim() || null;

  // 3. Lưu vào Database Supabase
  const { data, error } = await supabase
    .from('workers')
    .insert([
      {
        mnv:           (formData.get('employee_id') as string)?.trim(),
        full_name:     (formData.get('full_name')   as string)?.trim(),
        cccd:          (formData.get('cccd')        as string)?.trim(),
        area:          (formData.get('work_area')   as string)?.trim(),
        team:          (formData.get('team_name')   as string)?.trim(),
        position,
        vehicle_plate: vehiclePlate,
        vehicle_type:  vehicleType,
        portrait_url:  portraitUrl || null,
        status:        'active',
      },
    ])
    .select();

  if (error) {
    console.error('Supabase insert error:', JSON.stringify(error, null, 2));

    // Trả về lỗi cụ thể thay vì throw
    if (error.code === '23505') {
      // Unique constraint violation
      throw new Error('CCCD hoặc Mã nhân viên đã tồn tại trong hệ thống');
    }
    if (error.code === '23502') {
      throw new Error(`Thiếu thông tin bắt buộc: ${error.message}`);
    }
    throw new Error(`Lỗi Database: ${error.message}`);
  }

  // 4. Gửi thông báo Telegram (không block nếu thất bại)
  try {
    const msg =
      `🟢 <b>NHÂN SỰ MỚI ĐÃ LƯU VÀO DB</b>\n\n` +
      `Họ tên: <b>${formData.get('full_name')}</b>\n` +
      `MNV: ${formData.get('employee_id')}\n` +
      `CCCD: ${formData.get('cccd')}\n` +
      `Chức vụ: ${position || 'Không có'}\n` +
      `Khu vực: ${formData.get('work_area')}\n` +
      `Tổ đội: ${formData.get('team_name')}`;
    await sendTelegramMessage(msg, 'HTML');
  } catch (telegramError) {
    console.warn('Telegram notification failed (không ảnh hưởng lưu DB):', telegramError);
  }

  return { success: true, data };
}

export async function updateWorkerAction(id: string, formData: FormData) {
  let portraitUrl = (formData.get('existing_portrait_url') as string) || null;

  // 1. Upload ảnh mới nếu có
  const file = formData.get('portrait') as File;
  if (file && file.size > 0) {
    const newUrl = await uploadToFlaskAPI(file);
    if (newUrl) portraitUrl = newUrl;
  }

  const vehiclePlate = (formData.get('vehicle_plate') as string)?.trim() || null;
  const vehicleType  = (formData.get('vehicle_type')  as string)?.trim() || null;
  const position     = (formData.get('position')      as string)?.trim() || null;

  // 2. Cập nhật Database
  const { data, error } = await supabase
    .from('workers')
    .update({
      mnv:           (formData.get('employee_id') as string)?.trim(),
      full_name:     (formData.get('full_name')   as string)?.trim(),
      cccd:          (formData.get('cccd')        as string)?.trim(),
      area:          (formData.get('work_area')   as string)?.trim(),
      team:          (formData.get('team_name')   as string)?.trim(),
      position,
      vehicle_plate: vehiclePlate,
      vehicle_type:  vehicleType,
      portrait_url:  portraitUrl,
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Supabase update error:', JSON.stringify(error, null, 2));
    if (error.code === '23505') {
      throw new Error('CCCD hoặc Mã nhân viên đã tồn tại trong hệ thống');
    }
    throw new Error(`Lỗi cập nhật: ${error.message}`);
  }

  return { success: true, data };
}

// ── Import hàng loạt từ Excel ─────────────────────────────────────────────────
export type ImportRow = {
  full_name: string;
  employee_id: string;
  cccd: string;
  team: string;
  area: string;
  position?: string;
  vehicle_plate?: string;
  vehicle_type?: string;
  phone?: string;
  start_date?: string;
};

export type ImportResult = {
  success: number;
  failed: number;
  errors: { row: number; name: string; reason: string }[];
};

export async function importWorkersAction(rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 vì dòng 1 là header, index bắt đầu từ 0

    // Validate bắt buộc
    if (!row.full_name?.trim() || !row.employee_id?.trim() || !row.cccd?.trim() || !row.team?.trim() || !row.area?.trim()) {
      result.failed++;
      result.errors.push({
        row: rowNum,
        name: row.full_name || '(trống)',
        reason: 'Thiếu thông tin bắt buộc (Họ tên, MNV, CCCD, Tổ đội, Khu vực)',
      });
      continue;
    }

    // Validate CCCD 12 số
    const cccdClean = row.cccd.trim().replace(/\s/g, '');
    if (!/^\d{12}$/.test(cccdClean)) {
      result.failed++;
      result.errors.push({
        row: rowNum,
        name: row.full_name,
        reason: `CCCD không hợp lệ: "${row.cccd}" (phải là 12 chữ số)`,
      });
      continue;
    }

    const { error } = await supabase.from('workers').insert({
      mnv:           row.employee_id.trim(),
      full_name:     row.full_name.trim(),
      cccd:          cccdClean,
      team:          row.team.trim(),
      area:          row.area.trim(),
      position:      row.position?.trim() || null,
      vehicle_plate: row.vehicle_plate?.trim() || null,
      vehicle_type:  row.vehicle_type?.trim() || null,
      status:        'active',
    });

    if (error) {
      result.failed++;
      let reason = error.message;
      if (error.code === '23505') reason = 'MNV hoặc CCCD đã tồn tại';
      result.errors.push({ row: rowNum, name: row.full_name, reason });
    } else {
      result.success++;
    }
  }

  // Thông báo Telegram tổng kết
  try {
    if (result.success > 0) {
      await sendTelegramMessage(
        `📥 <b>IMPORT EXCEL HOÀN TẤT</b>\n✅ Thành công: ${result.success}\n❌ Thất bại: ${result.failed}`,
        'HTML'
      );
    }
  } catch (_) {}

  return result;
}
