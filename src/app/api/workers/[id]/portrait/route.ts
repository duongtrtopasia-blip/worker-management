import { NextResponse } from 'next/server';
import { uploadPortrait } from '@/lib/google-drive';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file uploaded');

    const supabase = createRouteHandlerClient({ cookies });
    
    // Lấy worker info để biết đường dẫn thư mục
    const { data: worker } = await supabase.from('workers').select('*').eq('id', params.id).single();
    if (!worker) throw new Error('Worker not found');

    // Chuyển File sang Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ở đây lẽ ra cần lấy workerFolderId thông qua hàm getOrCreateFolder dựa vào thông tin worker
    // Tạm thời hardcode logic tìm thư mục root công nhân hoặc bạn có thể mở rộng hàm `createWorkerFolderStructure`
    // const workerFolderId = await getWorkerFolderId(worker); 
    const workerFolderId = 'dummy-folder-id'; // Cần thay thế bằng ID thật

    const result = await uploadPortrait({
      imageBuffer: buffer,
      fileName: file.name,
      workerFolderId,
    });

    // Cập nhật URL ảnh vào database
    await supabase.from('workers').update({ 
      portrait_url: result.viewUrl,
      portrait_drive_id: result.fileId
    }).eq('id', params.id);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
