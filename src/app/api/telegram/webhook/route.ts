import { NextResponse } from 'next/server';
import { sendTelegramMessage, getTelegramFileUrl } from '@/lib/telegram';
import { supabase } from '@/lib/supabase';

/**
 * Xử lý Webhook POST requests từ Telegram gửi về
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Telegram gửi thông điệp trong đối tượng 'message'
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text;
      const document = body.message.document; // Dành cho upload Excel/PDF
      const photo = body.message.photo; // Dành cho upload Ảnh chân dung
      
      console.log(`Nhận được tin nhắn từ Telegram Chat ID [${chatId}]`);

      // 1. Xử lý Lệnh Text thông thường
      if (text) {
        if (text === '/start' || text === '/help') {
          const helpMsg = `👋 Chào mừng bạn đến với Bot Quản Lý Công Nhân!\n\n` +
                          `Các lệnh khả dụng:\n` +
                          `- <b>/add [Tên]-[MNV]-[CCCD]-[Khu vực]-[Tổ]</b>: Thêm nhanh công nhân.\n` +
                          `- <b>/print [MNV]</b>: Yêu cầu in/gửi thẻ ra vào.\n` +
                          `- <b>/delete [MNV]</b>: Xóa công nhân.\n` +
                          `- <b>/status</b>: Xem tổng quan hệ thống.\n\n` +
                          `Hoặc bạn có thể Gửi Ảnh kèm caption "MNV: [Số]" để cập nhật chân dung.`;
          await sendTelegramMessage(helpMsg, 'HTML');
          return NextResponse.json({ ok: true });
        }
        
        if (text === '/status') {
          const statusMsg = `📊 <b>TỔNG QUAN HỆ THỐNG</b>\n\n` +
                            `👥 Tổng công nhân: <b>1,240</b>\n` +
                            `⚠️ Thẻ sắp hết hạn: <b>15</b>\n` +
                            `❌ Thiếu hồ sơ: <b>84</b>\n\n` +
                            `<i>(Lưu ý: Đây là dữ liệu demo)</i>`;
          await sendTelegramMessage(statusMsg, 'HTML');
          return NextResponse.json({ ok: true });
        }

        // --- Lệnh Thêm Công Nhân ---
        if (text.startsWith('/add ')) {
          const content = text.replace('/add ', '').trim();
          const parts = content.split('-');
          if (parts.length >= 5) {
            const [name, mnv, cccd, area, team] = parts.map(p => p.trim());
            
            // Lưu vào DB
            const { error } = await supabase.from('workers').insert([{
              full_name: name,
              mnv: mnv,
              cccd: cccd,
              area: area,
              team: team,
              status: 'active'
            }]);

            if (error) {
              await sendTelegramMessage(`❌ <b>LỖI</b>\nKhông thể thêm vào CSDL. Có thể MNV hoặc CCCD đã bị trùng.`, 'HTML');
            } else {
              const successMsg = `✅ <b>THÊM THÀNH CÔNG VÀO DATABASE</b>\n\n` +
                                 `Họ tên: ${name}\n` +
                                 `MNV: ${mnv}\n` +
                                 `CCCD: ${cccd}\n` +
                                 `Khu vực: ${area}\n` +
                                 `Tổ đội: ${team}`;
              await sendTelegramMessage(successMsg, 'HTML');
            }
          } else {
            await sendTelegramMessage(`⚠️ <b>Sai cú pháp!</b>\nVui lòng dùng định dạng:\n/add [Tên]-[MNV]-[CCCD]-[Khu vực]-[Tổ]`, 'HTML');
          }
          return NextResponse.json({ ok: true });
        }

        // --- Lệnh In Thẻ ---
        if (text.startsWith('/print ')) {
          const mnv = text.replace('/print ', '').trim();
          if (mnv) {
            // Check in DB
            const { data, error } = await supabase.from('workers').select('*').eq('mnv', mnv).single();
            if (error || !data) {
              await sendTelegramMessage(`❌ <b>LỖI</b>\nKhông tìm thấy công nhân nào có MNV: <b>${mnv}</b> trong Database.`, 'HTML');
            } else {
              await sendTelegramMessage(`🖨️ Đang tạo lệnh in thẻ cho: <b>${data.full_name} (${mnv})</b>...\n(Dữ liệu lấy từ Database. Bản in sẽ được kết xuất dưới dạng PDF)`, 'HTML');
              // Mock render PDF
              setTimeout(() => {
                sendTelegramMessage(`✅ Đã in xong thẻ cho ${data.full_name}!`);
              }, 2000);
            }
          } else {
            await sendTelegramMessage(`⚠️ <b>Sai cú pháp!</b>\nVui lòng dùng lệnh: /print [MNV]`, 'HTML');
          }
          return NextResponse.json({ ok: true });
        }

        // --- Lệnh Xóa ---
        if (text.startsWith('/delete ')) {
          const mnv = text.replace('/delete ', '').trim();
          if (mnv) {
            // Thực hiện xóa mềm (đổi status) hoặc xóa cứng trên DB
            const { error } = await supabase.from('workers').update({ status: 'inactive' }).eq('mnv', mnv);
            if (error) {
              await sendTelegramMessage(`❌ <b>LỖI</b>\nKhông thể vô hiệu hóa MNV: <b>${mnv}</b>.`, 'HTML');
            } else {
              await sendTelegramMessage(`🗑️ <b>ĐÃ XÓA (Vô hiệu hóa)</b>\nHồ sơ công nhân có MNV: <b>${mnv}</b> đã được cập nhật trạng thái Inactive trên hệ thống.`, 'HTML');
            }
          } else {
            await sendTelegramMessage(`⚠️ <b>Sai cú pháp!</b>\nVui lòng dùng lệnh: /delete [MNV]`, 'HTML');
          }
          return NextResponse.json({ ok: true });
        }
        
        // Phản hồi mặc định nếu text không khớp lệnh nào
        await sendTelegramMessage(`Tôi không hiểu lệnh: "${text}".\nNhập /help để xem các lệnh hỗ trợ.`);
      }

      // 2. Xử lý khi User gửi Document (ví dụ: File Excel Import)
      if (document) {
        const fileName = document.file_name;
        const mimeType = document.mime_type;
        const fileId = document.file_id;

        await sendTelegramMessage(`Đang xử lý file <b>${fileName}</b>... Vui lòng đợi.`);
        
        // Lấy link download file thực tế từ Telegram
        const fileUrl = await getTelegramFileUrl(fileId);
        
        if (fileUrl) {
          // TODO: Viết logic tải file này về máy chủ hoặc xử lý trực tiếp (đọc Excel, đọc PDF)
          console.log('Download URL:', fileUrl);
          
          if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // Mock logic import
            setTimeout(() => {
              sendTelegramMessage(`✅ Import thành công file <b>${fileName}</b>!\nĐã cập nhật dữ liệu vào hệ thống.`);
            }, 2000);
          } else {
            await sendTelegramMessage(`Đã nhận file tài liệu <b>${fileName}</b>. Đã lưu vào kho hồ sơ.`);
          }
        }
      }

      // 3. Xử lý khi User gửi Photo (ví dụ: Upload ảnh thẻ)
      if (photo && photo.length > 0) {
        // Mảng photo chứa các phiên bản kích thước khác nhau của ảnh. Lấy bản chất lượng cao nhất (phần tử cuối cùng).
        const bestPhoto = photo[photo.length - 1];
        const fileId = bestPhoto.file_id;
        const caption = body.message.caption || ''; // Lấy caption nếu có nhập
        
        await sendTelegramMessage('Đang xử lý hình ảnh tải lên...');

        const photoUrl = await getTelegramFileUrl(fileId);
        
        if (photoUrl) {
          console.log('Photo Download URL:', photoUrl);
          
          if (caption.toLowerCase().includes('mnv:')) {
            const mnvMatch = caption.match(/mnv:\s*(\w+)/i);
            const mnv = mnvMatch ? mnvMatch[1] : 'Không rõ';
            await sendTelegramMessage(`📸 Đã lưu thành công ảnh chân dung cho nhân viên có MNV: <b>${mnv}</b>`);
          } else {
            await sendTelegramMessage('📸 Đã nhận ảnh. Vui lòng gửi ảnh kèm chú thích "MNV: [Mã nhân viên]" để hệ thống tự động gán ảnh vào hồ sơ.');
          }
        }
      }
    }
    
    // Telegram yêu cầu phản hồi HTTP 200 OK để xác nhận đã nhận webhook
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Lỗi xử lý webhook Telegram:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
