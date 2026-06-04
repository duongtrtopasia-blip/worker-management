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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
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
 * Gửi yêu cầu phê duyệt thẻ kèm nút bấm inline cho Admin
 * Admin nhấn nút trực tiếp trong Telegram để duyệt/từ chối
 */
export async function sendCardApprovalRequest({
  workerId,
  workerName,
  mnv,
  team,
  area,
  requestedBy,
}: {
  workerId: string;
  workerName: string;
  mnv: string;
  team: string;
  area: string;
  requestedBy: string;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return false;

  const message =
    `🛎 <b>YÊU CẦU CẤP THẺ RA VÀO</b>\n\n` +
    `👤 Họ tên: <b>${workerName}</b>\n` +
    `🔢 MNV: <code>${mnv}</code>\n` +
    `🏗 Tổ đội: ${team}\n` +
    `📍 Khu vực: ${area}\n` +
    `👤 Người trình: <b>${requestedBy}</b>\n\n` +
    `Vui lòng phê duyệt hoặc từ chối yêu cầu này:`;

  // Inline keyboard với 2 nút bấm
  const inlineKeyboard = {
    inline_keyboard: [[
      {
        text: '✅ Phê duyệt',
        callback_data: `approve_card:${workerId}`,
      },
      {
        text: '❌ Từ chối',
        callback_data: `reject_card:${workerId}`,
      },
    ]],
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Lỗi gửi approval request Telegram:', data);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Lỗi kết nối Telegram:', error);
    return false;
  }
}

/**
 * Trả lời callback query (xác nhận khi admin nhấn nút)
 * Giúp nút không bị "loading" mãi sau khi nhấn
 */
export async function answerCallbackQuery(callbackQueryId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
      show_alert: false,
    }),
  });
}

/**
 * Chỉnh sửa tin nhắn cũ — thay nút bấm bằng kết quả sau khi admin đã duyệt
 */
export async function editTelegramMessage(chatId: string | number, messageId: number, newText: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: newText,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [] }, // Xóa nút sau khi đã xử lý
    }),
  });
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
