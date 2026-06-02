export type QRCodeData = {
  v: number;
  type: 'person' | 'vehicle';
  card_no: string;
  mnv: string;
  name: string;
  team: string;
  area: string;
  vehicle_plate?: string;
  issue: string;
  expiry: string;
};

/**
 * Mã hóa payload QR Code.
 * JSON -> String -> Base64 -> Prefix "WM:"
 */
export function encodeQRCodeData(data: QRCodeData): string {
  const jsonString = JSON.stringify(data);
  const base64Str = Buffer.from(jsonString, 'utf-8').toString('base64');
  return `WM:${base64Str}`;
}

/**
 * Giải mã payload từ máy quét QR Code.
 */
export function decodeQRCodeData(qrString: string): QRCodeData | null {
  // Định dạng mới đơn giản: MNV - Họ Tên - Biển số xe
  const parts = qrString.split(' - ');
  if (parts.length >= 2) {
    return {
      v: 2,
      type: 'person',
      card_no: `VCS-${parts[0]}`,
      mnv: parts[0],
      name: parts[1],
      team: 'N/A',
      area: 'N/A',
      vehicle_plate: parts[2] || undefined,
      issue: new Date().toISOString(),
      expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
    };
  }
  
  // Hỗ trợ định dạng JSON nén cũ (nếu quét trúng thẻ cũ)
  if (qrString.startsWith('WM:')) {
    try {
      const base64Str = qrString.substring(3);
      const jsonString = Buffer.from(base64Str, 'base64').toString('utf-8');
      return JSON.parse(jsonString) as QRCodeData;
    } catch (error) {
      console.error('Lỗi khi decode QR:', error);
      return null;
    }
  }

  return null;
}
