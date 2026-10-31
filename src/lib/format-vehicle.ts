/**
 * Chuẩn hóa biển số xe Việt Nam:
 * - Chuyển sang chữ in hoa, bỏ khoảng trắng thừa
 * - Nếu là biển 5 số (dù nhập riêng 5 số như "44242" hay kèm tiền tố "21B1-44242", "21B1 44242"):
 *   tự động đưa về dạng chuẩn xxx.xx (Ví dụ: "21B1-442.42" hoặc "442.42")
 * - Giữ nguyên nếu là biển 4 số cũ (ví dụ: "37H5-9382") hoặc đã chuẩn.
 */
export function formatVehiclePlate(plate?: string | null): string {
  if (!plate) return '';
  let cleaned = plate.trim().toUpperCase();
  if (!cleaned) return '';

  // Thay khoảng trắng thành gạch nối
  cleaned = cleaned.replace(/\s+/g, '-');

  // Đã có dạng chuẩn [Seri-]xxx.xx hoặc xxx.xx
  if (/^([A-Z0-9]+-)?\d{3}\.\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Dạng có gạch nối hoặc dấu chấm giữa 3 số đầu và 2 số cuối: xxx-xx hoặc [Seri-]xxx-xx -> xxx.xx
  const matchSeparated = cleaned.match(/^(.*?)(\d{3})[-.](\d{2})$/);
  if (matchSeparated) {
    let prefix = matchSeparated[1];
    if (prefix.length > 0 && !prefix.endsWith('-') && !prefix.endsWith('.')) {
      prefix = prefix + '-';
    }
    return prefix + matchSeparated[2] + '.' + matchSeparated[3];
  }

  // Chỉ có 5 số: 12345 -> 123.45
  if (/^\d{5}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  }

  // Biển kết thúc bằng 5 số liền nhau chưa có dấu: e.g. "21B1-44242" hoặc "21B144242" -> "21B1-442.42"
  const matchFive = cleaned.match(/^(.*?)(\d{3})(\d{2})$/);
  if (matchFive) {
    let prefix = matchFive[1];
    if (prefix.length > 0 && !prefix.endsWith('-') && !prefix.endsWith('.')) {
      prefix = prefix + '-';
    }
    return prefix + matchFive[2] + '.' + matchFive[3];
  }

  return cleaned;
}
