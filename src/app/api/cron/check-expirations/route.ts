import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase client sử dụng Service Role Key (vượt qua RLS do Cron chạy ở background)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export async function GET(request: Request) {
  // Chỉ cho phép request có chứa header bảo mật từ Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + 30); // Cảnh báo trước 30 ngày

    const thresholdIso = thresholdDate.toISOString().split('T')[0];

    // Quét thẻ ra vào sắp hết hạn
    const { data: expiringCards, error: cardsError } = await supabase
      .from('access_cards')
      .select('id, worker_id, card_number, expiry_date')
      .eq('status', 'active')
      .lte('expiry_date', thresholdIso)
      .gte('expiry_date', today.toISOString().split('T')[0]);

    if (cardsError) throw cardsError;

    // Quét tài liệu sắp hết hạn (từ bảng document_status)
    const { data: expiringDocs, error: docsError } = await supabase
      .from('document_status')
      .select('worker_id, health_certificate_expiry, safety_card_expiry')
      .or(`health_certificate_expiry.lte.${thresholdIso},safety_card_expiry.lte.${thresholdIso}`);

    if (docsError) throw docsError;

    // TODO: Tích hợp gửi Email thông báo tới Admin (VD: dùng Resend) 
    // hoặc lưu vào bảng Notifications trong DB.
    
    // Ở MVP này ta chỉ ghi Log vào audit_logs
    if (expiringCards && expiringCards.length > 0) {
       await supabase.from('audit_logs').insert([{
         action_type: 'SYSTEM_ALERT',
         entity_type: 'system',
         description: `Hệ thống phát hiện ${expiringCards.length} thẻ ra vào sắp hết hạn trong 30 ngày tới.`,
       }]);
    }

    return NextResponse.json({ 
      success: true, 
      expiringCardsFound: expiringCards?.length || 0,
      expiringDocsFound: expiringDocs?.length || 0
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
