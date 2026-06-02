// File: src/lib/telegram.ts

export async function sendTelegramMessage(text: string, parseMode: 'HTML' | 'MarkdownV2' = 'HTML') {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong .env');
    return false;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: parseMode,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Lỗi khi gửi tin nhắn Telegram:', data);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Lỗi kết nối API Telegram:', error);
    return false;
  }
}

/**
 * Lấy đường dẫn file trực tiếp từ Telegram File ID (dùng khi user upload file qua chat)
 * @param fileId ID của file do Telegram trả về trong webhook
 */
export async function getTelegramFileUrl(fileId: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  try {
    const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
    const res = await fetch(getFileUrl);
    const data = await res.json();
    
    if (data.ok && data.result.file_path) {
      return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
    }
    return null;
  } catch (error) {
    console.error('Lỗi khi lấy file từ Telegram:', error);
    return null;
  }
}
