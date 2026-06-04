'use server';

import { sendTelegramMessage, sendCardApprovalRequest } from '@/lib/telegram';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { createNotification } from './notification';
import { uploadToOneDrive } from '@/lib/onedrive';

export async function uploadToFlaskAPI(file: File): Promise<string> {
  // Đã chuyển sang dùng trực tiếp Next.js upload thay vì Flask API để tương thích Vercel
  return await uploadToOneDrive(file);
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

  const cookieStore = cookies();
  const role = cookieStore.get('user_role')?.value || 'admin';
  const username = cookieStore.get('username')?.value || 'unknown';

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

  // Insert audit log
  await supabase.from('audit_logs').insert({
    actor: username,
    role: role,
    action: 'CREATE',
    target: `${formData.get('full_name')} (${formData.get('employee_id')})`,
    details: 'Đã thêm công nhân mới'
  });

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

  const cookieStore = cookies();
  const role = cookieStore.get('user_role')?.value || 'admin';
  const username = cookieStore.get('username')?.value || 'unknown';

  // Insert audit log
  await supabase.from('audit_logs').insert({
    actor: username,
    role: role,
    action: 'UPDATE',
    target: `${formData.get('full_name')} (${formData.get('employee_id')})`,
    details: 'Đã cập nhật thông tin hồ sơ'
  });

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

export async function updateCardStatusAction(workerId: string, newStatus: string) {
  const cookieStore = cookies();
  const role = cookieStore.get('user_role')?.value;
  const username = cookieStore.get('username')?.value || 'unknown';

  if (newStatus === 'approved' && role !== 'admin') {
    throw new Error('Chỉ Admin mới có quyền phê duyệt thẻ');
  }

  const { data: worker, error: wError } = await supabase.from('workers').select('mnv, full_name, card_status').eq('id', workerId).single();
  if (wError) throw new Error('Không tìm thấy công nhân');

  const { error } = await supabase.from('workers').update({ card_status: newStatus }).eq('id', workerId);
  if (error) throw new Error(error.message);

  let actionName = 'REQUEST_CARD';
  let details = 'Đã gửi yêu cầu cấp thẻ ra vào';
  if (newStatus === 'approved') {
    actionName = 'APPROVE_CARD';
    details = 'Đã phê duyệt yêu cầu cấp thẻ';
  } else if (newStatus === 'rejected') {
    actionName = 'REJECT_CARD';
    details = 'Đã từ chối yêu cầu cấp thẻ';
  }

  // Add audit log
  await supabase.from('audit_logs').insert({
    actor: username,
    role: role || 'admin',
    action: actionName,
    target: `${worker.full_name} (${worker.mnv})`,
    details: details
  });

  // Gửi thông báo trong hệ thống
  if (newStatus === 'pending') {
    await createNotification('Yêu cầu cấp thẻ', `${username} vừa yêu cầu cấp thẻ cho ${worker.full_name}`, 'admin', '/cards');
    // Gửi Telegram kèm nút bấm phê duyệt nhanh
    try {
      const { data: workerDetail } = await supabase
        .from('workers')
        .select('team, area')
        .eq('id', workerId)
        .single();
      await sendCardApprovalRequest({
        workerId,
        workerName: worker.full_name,
        mnv: worker.mnv,
        team: workerDetail?.team || '',
        area: workerDetail?.area || '',
        requestedBy: username,
      });
    } catch (e) {
      console.warn('Không gửi được Telegram approval request:', e);
    }
  } else if (newStatus === 'approved') {
    await createNotification('Thẻ đã được duyệt', `Yêu cầu cấp thẻ cho ${worker.full_name} đã được phê duyệt`, 'editor', '/cards');
  } else if (newStatus === 'rejected') {
    await createNotification('Từ chối cấp thẻ', `Yêu cầu cấp thẻ cho ${worker.full_name} đã bị từ chối`, 'editor', '/cards');
  }

  return { success: true };
}

export async function updateCardStatusBulkAction(workerIds: string[], newStatus: string) {
  if (!workerIds || workerIds.length === 0) return { success: true };

  const cookieStore = cookies();
  const role = cookieStore.get('user_role')?.value;
  const username = cookieStore.get('username')?.value || 'unknown';

  if (newStatus === 'approved' && role !== 'admin') {
    throw new Error('Chỉ Admin mới có quyền phê duyệt thẻ');
  }

  // Update all
  const { error } = await supabase.from('workers').update({ card_status: newStatus }).in('id', workerIds);
  if (error) throw new Error(error.message);

  let actionName = 'REQUEST_CARD_BULK';
  let details = `Đã gửi yêu cầu cấp thẻ cho ${workerIds.length} công nhân`;
  let telegramMsg = `🛎 <b>YÊU CẦU CẤP THẺ MỚI</b>\n\nNgười yêu cầu: <b>${username}</b>\nSố lượng: ${workerIds.length} thẻ\nVui lòng vào hệ thống để phê duyệt.`;

  if (newStatus === 'approved') {
    actionName = 'APPROVE_CARD_BULK';
    details = `Đã phê duyệt yêu cầu cấp thẻ cho ${workerIds.length} công nhân`;
    telegramMsg = `✅ <b>THẺ ĐÃ ĐƯỢC PHÊ DUYỆT</b>\n\nNgười duyệt: <b>${username}</b>\nSố lượng: ${workerIds.length} thẻ\nCác thẻ đã được chuyển sang Hàng đợi In.`;
  } else if (newStatus === 'issued') {
    actionName = 'ISSUE_CARD_BULK';
    details = `Đã in và cấp ${workerIds.length} thẻ ra vào`;
    telegramMsg = `🖨 <b>THẺ ĐÃ ĐƯỢC IN</b>\n\nSố lượng: ${workerIds.length} thẻ\nCác thẻ đã được lấy khỏi Hàng đợi In.`;
  }

  // Send Telegram Notification
  try {
    await sendTelegramMessage(telegramMsg, 'HTML');
  } catch (telegramError) {
    console.warn('Telegram notification failed:', telegramError);
  }

  // Gửi thông báo trong hệ thống
  if (newStatus === 'pending') {
    await createNotification('Yêu cầu cấp thẻ', `${username} vừa yêu cầu cấp thẻ cho ${workerIds.length} công nhân`, 'admin', '/cards');
  } else if (newStatus === 'approved') {
    await createNotification('Thẻ đã được duyệt', `${username} đã phê duyệt thẻ cho ${workerIds.length} công nhân`, 'editor', '/cards');
  } else if (newStatus === 'issued') {
    await createNotification('Thẻ đã được in', `${workerIds.length} thẻ ra vào đã được xuất để in`, 'editor', '/cards');
  }

  // Add audit log
  await supabase.from('audit_logs').insert({
    actor: username,
    role: role || 'admin',
    action: actionName,
    target: `${workerIds.length} công nhân`,
    details: details
  });

  return { success: true };
}

export async function uploadBulkImagesAction(formData: FormData) {
  const files = formData.getAll('images') as File[];
  if (!files || files.length === 0) {
    throw new Error('Không có file nào được chọn');
  }

  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const file of files) {
    try {
      const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const cccd = fileNameWithoutExt.trim();

      // 1. Kiểm tra xem công nhân có tồn tại không
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('cccd', cccd)
        .single();

      if (!worker) {
        results.failed++;
        results.errors.push(`Không tìm thấy công nhân mang CCCD: ${cccd} (Tên file: ${file.name})`);
        continue;
      }

      // 2. Upload ảnh
      const portraitUrl = await uploadToFlaskAPI(file);
      if (!portraitUrl) {
        results.failed++;
        results.errors.push(`Upload thất bại hoặc Flask API lỗi cho CCCD: ${cccd}`);
        continue;
      }

      // 3. Cập nhật URL ảnh vào Database
      const { error: updateError } = await supabase
        .from('workers')
        .update({ portrait_url: portraitUrl })
        .eq('cccd', cccd);

      if (updateError) {
        results.failed++;
        results.errors.push(`Lỗi cập nhật CSDL cho CCCD: ${cccd}`);
      } else {
        results.success++;
      }
    } catch (e: any) {
      results.failed++;
      results.errors.push(`Lỗi với file ${file.name}: ${e.message}`);
    }
  }

  return results;
}
