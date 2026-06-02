import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Capture HTML elements and generate a PDF with multiple cards per page.
 * Cấu hình: Giấy A4 (210 x 297 mm). Mỗi trang 8 thẻ (2 cột x 4 hàng).
 * Kích thước thẻ CR80: 85.6 x 54 mm.
 */
export async function generateCardsPDF(elementIds: string[]): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const cardWidth = 85.6;
  const cardHeight = 54;
  const marginX = 15;
  const marginY = 20;
  const gapX = 10;
  const gapY = 10;

  let currentItem = 0;
  
  for (let i = 0; i < elementIds.length; i++) {
    const el = document.getElementById(elementIds[i]);
    if (!el) continue;

    // html2canvas capture the element
    const canvas = await html2canvas(el, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL('image/png');

    // Calculate position
    const col = currentItem % 2;
    const row = Math.floor((currentItem % 8) / 2);
    
    const x = marginX + col * (cardWidth + gapX);
    const y = marginY + row * (cardHeight + gapY);

    // Xử lý thẻ dọc/ngang dựa vào kích thước element (chỉ định tĩnh theo CR80 gốc)
    // Thực tế CardTemplate sẽ quyết định tỉ lệ, ta có thể xoay nếu cần, 
    // nhưng để đơn giản ta addImage vào vùng giới hạn của cardWidth/cardHeight.
    
    // Kiểm tra tỉ lệ ảnh để map vào (dọc vs ngang)
    const isPortrait = canvas.height > canvas.width;
    let finalW = cardWidth;
    let finalH = cardHeight;
    
    if (isPortrait) {
      finalW = 54;
      finalH = 85.6;
    }

    pdf.addImage(imgData, 'PNG', x, y, finalW, finalH);

    // Thêm đường cắt (Cut lines) nhẹ
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, finalW, finalH);

    currentItem++;

    // Sang trang nếu đủ 8 thẻ (trừ thẻ cuối cùng)
    if (currentItem > 0 && currentItem % 8 === 0 && i < elementIds.length - 1) {
      pdf.addPage();
    }
  }

  return pdf.output('blob');
}
