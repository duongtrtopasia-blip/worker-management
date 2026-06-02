'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CardTemplate, CardData } from '@/components/cards/CardTemplate';
import { Printer, RefreshCw, CheckSquare, Square, PrinterCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { encodeQRCodeData } from '@/lib/qr-generator';

export default function CardsPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Lỗi khi tải dữ liệu thẻ');
    } else if (data && data.length > 0) {
      setWorkers(data);
      setSelectedWorker(data[0]);
    }
    setLoading(false);
  };

  // Tạo CardData từ worker object
  const buildCardData = (w: any): CardData => ({
    card_type: 'person',
    card_number: `VCS-${w.mnv}`,
    worker: {
      full_name: w.full_name,
      employee_id: w.mnv,
      cccd_number: w.cccd,
      team_name: w.team,
      work_area: w.area,
      position: w.position || 'CÔNG NHÂN',
      portrait_url: w.portrait_url || 'https://i.pravatar.cc/300',
    },
    vehicle_plate: w.vehicle_plate || undefined,
    vehicle_type: w.vehicle_type || undefined,
    project_name: 'Khu DLND Mỹ Lâm\nTuyên Quang',
    contractor_name: 'VINCONS',
    issue_date: new Date().toISOString(),
    expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
    qr_data: `${w.mnv} - ${w.full_name}${w.vehicle_plate ? ` - ${w.vehicle_plate}` : ''}`,
  });

  // Helper mở cửa sổ in với HTML tuỳ chỉnh
  const openPrintWindow = (bodyHTML: string, pageSize: string) => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      toast.error('Vui lòng cho phép mở popup để in thẻ!');
      return;
    }

    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @font-face {
            font-family: 'UTM Avo';
            font-style: normal;
            font-weight: 400;
            src: url('${window.location.origin}/fonts/UTMAvo-Regular.ttf') format('truetype');
          }
          @font-face {
            font-family: 'UTM Avo';
            font-style: normal;
            font-weight: 700;
            src: url('${window.location.origin}/fonts/UTMAvo-Bold.ttf') format('truetype');
          }
        </style>
        <style>
          ${styles}
          @page {
            size: ${pageSize};
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: white;
            font-family: 'UTM Avo', sans-serif;
          }
          @media print {
            html, body { background: white; }
          }
        </style>
      </head>
      <body>
        ${bodyHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        toast.success('Hộp thoại in đã mở!');
      }, 800);
    };
  };

  // In thẻ đơn
  const handlePrintSingle = () => {
    if (!selectedWorker) return;
    const cardElement = document.getElementById('card-preview');
    if (!cardElement) return;

    const bodyHTML = `
      <div style="
        width: 85.6mm;
        height: 54mm;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${cardElement.innerHTML}
      </div>
    `;
    openPrintWindow(bodyHTML, '85.6mm 54mm');
  };

  // In hàng loạt: 2 cột × 5 hàng = 10 thẻ/tờ A4
  const handlePrintBulk = () => {
    const targetWorkers = checkedIds.size > 0
      ? workers.filter((w) => checkedIds.has(w.id))
      : workers;

    if (targetWorkers.length === 0) {
      toast.error('Không có công nhân nào để in!');
      return;
    }

    // Lấy HTML từ các hidden card đã render sẵn
    const cardHTMLs: string[] = [];
    targetWorkers.forEach((w) => {
      const cardEl = document.querySelector(`[data-worker-id="${w.id}"]`);
      if (cardEl) {
        cardHTMLs.push(cardEl.innerHTML);
      }
    });

    if (cardHTMLs.length === 0) {
      toast.error('Không thể lấy dữ liệu thẻ để in!');
      return;
    }

    // Tạo layout A4: 2 cột × 5 hàng = 10 thẻ/trang
    // Thẻ: 85.6mm × 54mm | A4: 210mm × 297mm
    // margin ngang: (210 - 2×85.6 - 4mm gap) / 2 ≈ 17.4mm
    // margin dọc: (297 - 5×54 - 4×4mm gap) / 2 ≈ 5.5mm
    const cardsPerPage = 10;
    const pages: string[][] = [];
    for (let i = 0; i < cardHTMLs.length; i += cardsPerPage) {
      pages.push(cardHTMLs.slice(i, i + cardsPerPage));
    }

    const pagesHTML = pages.map((pageCards, pi) => {
      const cells = Array.from({ length: cardsPerPage }, (_, i) => {
        const html = pageCards[i] || '';
        return `
          <div style="
            width: 85.6mm;
            height: 54mm;
            overflow: hidden;
            flex-shrink: 0;
            ${html ? '' : 'visibility:hidden;'}
          ">
            ${html}
          </div>
        `;
      }).join('');

      return `
        <div style="
          width: 210mm;
          height: 297mm;
          display: flex;
          flex-wrap: wrap;
          align-content: center;
          justify-content: center;
          gap: 4mm;
          padding: 5.5mm 17.4mm;
          box-sizing: border-box;
          page-break-after: ${pi < pages.length - 1 ? 'always' : 'auto'};
          background: white;
        ">
          ${cells}
        </div>
      `;
    }).join('');

    openPrintWindow(pagesHTML, 'A4 portrait');
  };

  // Toggle chọn/bỏ chọn một worker
  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Chọn tất cả / bỏ tất cả
  const toggleAll = () => {
    if (checkedIds.size === workers.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(workers.map((w) => w.id)));
    }
  };

  const cardData = selectedWorker ? buildCardData(selectedWorker) : null;
  const allChecked = workers.length > 0 && checkedIds.size === workers.length;
  const someChecked = checkedIds.size > 0 && checkedIds.size < workers.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-blue-900">Quản Lý Thẻ Ra Vào</h1>
        <div className="flex space-x-2 flex-wrap gap-2">
          <Button variant="outline" onClick={fetchWorkers}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </Button>
          <Button onClick={handlePrintSingle} disabled={!cardData} variant="outline">
            <Printer className="mr-2 h-4 w-4" /> In Thẻ Này
          </Button>
          <Button
            onClick={handlePrintBulk}
            disabled={workers.length === 0}
            className="bg-brand-blue hover:bg-brand-blue/90 text-white"
          >
            <PrinterCheck className="mr-2 h-4 w-4" />
            {checkedIds.size > 0
              ? `In ${checkedIds.size} thẻ đã chọn`
              : `In tất cả (${workers.length} thẻ)`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Preview */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Bản Xem Trước</h2>
            <span className="px-3 py-1 text-sm rounded bg-white shadow font-bold text-blue-600 border">
              Thẻ Ngang
            </span>
          </div>

          <div className="flex justify-center bg-gray-50 p-8 rounded-lg overflow-x-auto min-h-[450px] items-center">
            {cardData ? (
              <div id="card-preview">
                <CardTemplate data={cardData} layout="horizontal" />
              </div>
            ) : (
              <p className="text-gray-400">Không có dữ liệu thẻ để hiển thị.</p>
            )}
          </div>
        </div>

        {/* Danh sách */}
        <div className="bg-white p-6 rounded-lg shadow border flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Danh sách công nhân chờ cấp thẻ</h2>
            {workers.length > 0 && (
              <button
                onClick={toggleAll}
                className="flex items-center gap-1 text-sm text-brand-blue hover:text-brand-blue/80 font-medium"
              >
                {allChecked ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            )}
          </div>

          {checkedIds.size > 0 && (
            <div className="mb-3 px-3 py-2 bg-blue-50 border border-brand-blue/30 rounded-md text-sm text-brand-blue font-medium">
              Đã chọn <span className="font-bold">{checkedIds.size}</span> / {workers.length} công nhân để in hàng loạt
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: '600px' }}>
            {loading ? (
              <div className="text-center text-gray-400 py-12">Đang tải dữ liệu từ DB...</div>
            ) : workers.length === 0 ? (
              <div className="text-center text-gray-400 py-12">Không có công nhân nào trong CSDL.</div>
            ) : (
              <div className="space-y-3">
                {workers.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWorker(w)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedWorker?.id === w.id
                        ? 'border-brand-blue bg-blue-50 ring-1 ring-brand-blue'
                        : 'hover:bg-gray-50'
                    } ${checkedIds.has(w.id) ? 'bg-green-50 border-green-400' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => toggleCheck(w.id, e)}
                        className="mt-0.5 shrink-0 text-green-600 hover:text-green-700"
                      >
                        {checkedIds.has(w.id) ? (
                          <CheckSquare className="h-5 w-5" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{w.full_name}</h3>
                        <p className="text-sm text-gray-500">MNV: {w.mnv} - CCCD: {w.cccd}</p>
                        <p className="text-sm text-brand-blue/80 mt-1">{w.team} - {w.area}</p>
                      </div>

                      <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded shrink-0">Mới</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden render vùng để lấy HTML từng thẻ khi in hàng loạt */}
      <div className="hidden">
        {workers.map((w) => (
          <div key={w.id} data-worker-id={w.id}>
            <CardTemplate data={buildCardData(w)} layout="horizontal" />
          </div>
        ))}
      </div>
    </div>
  );
}
