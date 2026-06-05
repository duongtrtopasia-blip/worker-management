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
  date_of_birth?: string;
  gender?: string;
  address?: string;
  work_status?: string;
};

export type ImportResult = {
  success: number;
  failed: number;
  errors: { row: number; name: string; reason: string }[];
};

async function fetchAllWorkersMinimal() {
  let allData: any[] = [];
  let from = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.from('workers').select('id, mnv, cccd').range(from, from + limit - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < limit) break;
    from += limit;
  }
  return allData;
}

export async function checkDuplicateWorkersAction(rows: ImportRow[]) {
  const existingWorkers = await fetchAllWorkersMinimal();
  const existingMnvs = new Set(existingWorkers.map(w => w.mnv));
  const existingCccds = new Set(existingWorkers.map(w => w.cccd));
  
  let duplicateCount = 0;
  for (const row of rows) {
    if (!row.cccd || !row.employee_id) continue;
    const cccdClean = row.cccd.trim().replace(/\s/g, '');
    const mnvClean = row.employee_id.trim();
    if (existingMnvs.has(mnvClean) || existingCccds.has(cccdClean)) {
      duplicateCount++;
    }
  }
  return duplicateCount;
}

export async function importWorkersAction(rows: ImportRow[], sendNotification = true, updateDuplicates = false): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, errors: [] };

  // 1. Fetch all existing MNV and CCCD to check duplicates in memory
  let existingWorkers: any[];
  try {
    existingWorkers = await fetchAllWorkersMinimal();
  } catch (fetchErr: any) {
    return { success: 0, failed: rows.length, errors: [{ row: 0, name: 'System', reason: `Lỗi kết nối DB: ${fetchErr.message}` }] };
  }

  const mnvMap = new Map(existingWorkers.map(w => [w.mnv, w.id]));
  const cccdMap = new Map(existingWorkers.map(w => [w.cccd, w.id]));

  const insertBatch = [];
  const updateBatch = [];

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

    const mnvClean = row.employee_id.trim();

    const parseDateStr = (dateStr: string | null | undefined) => {
      if (!dateStr) return null;
      const str = dateStr.trim();
      if (!str) return null;
      
      // Nếu là số (Excel serial date)
      if (/^\d+$/.test(str)) {
        const serial = parseInt(str, 10);
        // Excel epoch is Dec 30, 1899 due to 1900 leap year bug
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const jsDate = new Date(excelEpoch.getTime() + serial * 86400000);
        return jsDate.toISOString().split('T')[0];
      }

      // Nếu chứa '/' (vd: DD/MM/YYYY)
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      // Nếu chứa '-' (vd: DD-MM-YYYY hoặc YYYY-MM-DD)
      if (str.includes('-')) {
        const parts = str.split('-');
        if (parts.length === 3 && parts[0].length === 2) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      
      return str;
    };

    let dob = parseDateStr(row.date_of_birth);
    let startDate = parseDateStr(row.start_date);

    let status = 'active';
    const st = row.work_status?.toLowerCase().trim() || '';
    if (st.includes('nghỉ') || st.includes('thôi việc') || st.includes('inactive')) status = 'inactive';
    if (st.includes('tạm hoãn') || st.includes('suspended')) status = 'suspended';

    const rowData = {
      mnv:           mnvClean,
      full_name:     row.full_name.trim(),
      cccd:          cccdClean,
      team:          row.team.trim(),
      area:          row.area.trim(),
      position:      row.position?.trim() || null,
      vehicle_plate: row.vehicle_plate?.trim() || null,
      vehicle_type:  row.vehicle_type?.trim() || null,
      phone:         row.phone?.trim() || null,
      address:       row.address?.trim() || null,
      gender:        row.gender?.trim() || null,
      date_of_birth: dob,
      start_date:    startDate,
      status:        status,
    };

    // Check trùng lặp
    const workerId = cccdMap.get(cccdClean) || mnvMap.get(mnvClean);
    if (workerId) {
      if (!updateDuplicates || workerId === 'new') {
        result.failed++;
        result.errors.push({
          row: rowNum,
          name: row.full_name,
          reason: 'MNV hoặc CCCD đã tồn tại trong hệ thống (hoặc bị trùng lặp trong file)',
        });
        continue;
      } else {
        updateBatch.push({
          id: workerId,
          data: rowData,
          rowNum: rowNum,
          name: row.full_name.trim()
        });
        // Ngăn chặn update 2 lần trong cùng 1 file
        mnvMap.set(mnvClean, 'new');
        cccdMap.set(cccdClean, 'new');
        continue;
      }
    }

    // Đưa vào mảng insert và cập nhật Map để tránh trùng lặp giữa các dòng trong cùng 1 file
    insertBatch.push({
      data: rowData,
      rowNum: rowNum,
      name: row.full_name.trim()
    });
    mnvMap.set(mnvClean, 'new');
    cccdMap.set(cccdClean, 'new');
  }

  // Thực hiện Bulk Insert
  if (insertBatch.length > 0) {
    const rowsToInsert = insertBatch.map(item => item.data);
    const { error } = await supabase.from('workers').insert(rowsToInsert);
    if (error) {
      // Nếu insert lô thất bại, fallback sang insert từng dòng để cứu các dòng đúng và lấy lỗi chi tiết
      for (const item of insertBatch) {
        const { error: singleError } = await supabase.from('workers').insert(item.data);
        if (singleError) {
          result.failed++;
          result.errors.push({ row: item.rowNum, name: item.name, reason: `Lỗi CSDL: ${singleError.message}` });
        } else {
          result.success++;
        }
      }
    } else {
      result.success += insertBatch.length;
    }
  }

  // Thực hiện Update
  for (const item of updateBatch) {
    const { error } = await supabase.from('workers').update(item.data).eq('id', item.id);
    if (error) {
       result.failed++;
       result.errors.push({ row: item.rowNum, name: item.name, reason: `Lỗi cập nhật CSDL: ${error.message}` });
    } else {
       result.success++;
    }
  }

  // Thông báo Telegram tổng kết
  if (sendNotification) {
    try {
      if (result.success > 0) {
        await sendTelegramMessage(
          `📥 <b>IMPORT EXCEL HOÀN TẤT</b>\n✅ Thành công: ${result.success}\n❌ Thất bại: ${result.failed}`,
          'HTML'
        );
      }
    } catch (_) {}
  }

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

// ── Import hàng loạt Thẻ An Toàn ─────────────────────────────────────────────
export type SafetyCardImportRow = {
  cccd: string;
  safety_card_number?: string;
  safety_card_date?: string;
  card_status_text?: string;
};

export async function importSafetyCardsAction(rows: SafetyCardImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.cccd?.trim()) {
      result.failed++;
      result.errors.push({ row: rowNum, name: 'Không xác định', reason: 'Thiếu số CCCD' });
      continue;
    }

    const cccdClean = row.cccd.trim().replace(/\s/g, '');

    // Convert status text to card_status enum
    let mappedStatus = undefined;
    const st = row.card_status_text?.toLowerCase().trim() || '';
    if (st.includes('đang chờ cấp') || st.includes('chờ duyệt') || st.includes('pending')) mappedStatus = 'pending';
    else if (st.includes('đã đào tạo') || st.includes('chưa được cấp') || st.includes('chờ in') || st.includes('approved')) mappedStatus = 'approved';
    else if (st.includes('đã cấp') || st.includes('issued')) mappedStatus = 'issued';
    else if (st.includes('none')) mappedStatus = 'none';

    const updatePayload: any = {};
    if (row.safety_card_number && row.safety_card_number.trim() !== '') updatePayload.safety_card_number = row.safety_card_number.trim();
    if (row.safety_card_date && row.safety_card_date.trim() !== '') {
      // Format from Excel might be string dd/mm/yyyy
      const dateParts = row.safety_card_date.trim().split('/');
      if (dateParts.length === 3) {
        updatePayload.safety_card_date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      } else {
        updatePayload.safety_card_date = row.safety_card_date.trim();
      }
    }
    if (mappedStatus) updatePayload.card_status = mappedStatus;

    if (Object.keys(updatePayload).length === 0) {
      result.failed++;
      result.errors.push({ row: rowNum, name: cccdClean, reason: 'Không có dữ liệu Thẻ để cập nhật' });
      continue;
    }

    const { data: worker, error: selectErr } = await supabase.from('workers').select('id, full_name').eq('cccd', cccdClean).single();
    
    if (selectErr || !worker) {
      result.failed++;
      result.errors.push({ row: rowNum, name: cccdClean, reason: 'Không tìm thấy công nhân mang CCCD này' });
      continue;
    }

    const { error: updateErr } = await supabase.from('workers').update(updatePayload).eq('id', worker.id);

    if (updateErr) {
      result.failed++;
      result.errors.push({ row: rowNum, name: worker.full_name, reason: updateErr.message });
    } else {
      result.success++;
    }
  }

  return result;
}
