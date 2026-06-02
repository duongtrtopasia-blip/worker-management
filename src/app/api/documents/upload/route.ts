import { NextResponse } from 'next/server';
import { uploadDocument } from '@/lib/google-drive';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { DocumentType } from '@/types';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const workerId = formData.get('workerId') as string;
    const docType = formData.get('docType') as DocumentType;
    const issueDate = formData.get('issueDate') as string;
    const expiryDate = formData.get('expiryDate') as string;

    if (!file || !workerId || !docType) {
      throw new Error('Thiếu thông tin bắt buộc');
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // Tạm thời hardcode folder ID cho ví dụ. 
    // Thực tế cần query cấu trúc folder của worker này từ DB hoặc gọi lại Google Drive.
    const workerFolderId = 'dummy-worker-folder-id'; 

    // Chuyển File sang Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload lên Drive
    const result = await uploadDocument({
      pdfBuffer: buffer,
      fileName: file.name,
      docType,
      workerFolderId,
    });

    // Lưu metadata vào bảng documents
    const docRecord = {
      worker_id: workerId,
      doc_type: docType,
      doc_name: file.name,
      file_url: result.viewUrl,
      drive_file_id: result.fileId,
      file_size: file.size,
      issue_date: issueDate || null,
      expiry_date: expiryDate || null,
      status: 'valid'
    };

    const { error: dbError } = await supabase.from('documents').insert([docRecord]);
    if (dbError) throw dbError;

    // Cập nhật bảng document_status
    const updatePayload: any = { last_updated: new Date().toISOString() };
    if (docType === 'health_certificate') {
      updatePayload.health_certificate = true;
      if (expiryDate) updatePayload.health_certificate_expiry = expiryDate;
    } else if (docType === 'cccd_notarized') {
      updatePayload.cccd_notarized = true;
    } else if (docType === 'safety_card') {
      updatePayload.safety_card = true;
      if (expiryDate) updatePayload.safety_card_expiry = expiryDate;
    } else if (docType === 'safety_test') {
      updatePayload.safety_test = true;
    } else if (docType === 'safety_commitment') {
      updatePayload.safety_commitment = true;
    }

    await supabase.from('document_status').update(updatePayload).eq('worker_id', workerId);

    return NextResponse.json({ success: true, file: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
