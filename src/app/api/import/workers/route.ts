import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Worker } from '@/types';

export async function POST(request: Request) {
  try {
    const { workers } = await request.json() as { workers: Worker[] };
    
    if (!workers || !Array.isArray(workers)) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Sử dụng upsert: Xung đột (onConflict) dựa vào employee_id hoặc cccd_number
    // Ở đây ta đơn giản hoá bằng cách chèn hàng loạt (chấp nhận throw lỗi nếu trùng)
    // Tùy theo logic nghiệp vụ, nếu muốn "cập nhật nếu đã tồn tại" thì dùng upsert.
    
    const { data, error } = await supabase
      .from('workers')
      .upsert(workers, { onConflict: 'employee_id' })
      .select('id, employee_id');

    if (error) {
      throw error;
    }

    // Ghi log import
    await supabase.from('import_logs').insert([{
      file_name: 'Batch API Import',
      total_rows: workers.length,
      success_rows: data?.length || 0,
      failed_rows: workers.length - (data?.length || 0),
    }]);

    return NextResponse.json({ success: true, count: data?.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
