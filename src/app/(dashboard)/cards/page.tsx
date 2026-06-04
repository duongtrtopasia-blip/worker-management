'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CardTemplate, CardData } from '@/components/cards/CardTemplate';
import {
  Printer, RefreshCw, CheckSquare, Square, PrinterCheck,
  CreditCard, Clock, ChevronRight, RotateCcw, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { updateCardStatusBulkAction } from '@/app/actions/worker';

// Chế độ: 'print' = in lần đầu (approved), 'reprint' = in lại (issued)
type PrintMode = 'print' | 'reprint';

export default function CardsPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [printMode, setPrintMode] = useState<PrintMode>('print');

  useEffect(() => { fetchWorkers(); }, []);

  // Reset checked khi đổi filter hoặc mode
  useEffect(() => { setCheckedIds(new Set()); }, [filterStatus, printMode]);

  const fetchWorkers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .in('card_status', ['pending', 'approved', 'issued'])
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Lỗi khi tải dữ liệu thẻ');
    } else if (data && data.length > 0) {
      setWorkers(data);
      setSelectedWorker(data[0]);
    } else {
      setWorkers([]);
    }
    setLoading(false);
  };

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

  const openPrintWindow = (bodyHTML: string, pageSize: string) => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) { toast.error('Vui lòng cho phép mở popup để in thẻ!'); return; }
    const styles = Array.from(document.styleSheets)
      .map((sheet) => { try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n'); } catch { return ''; } })
      .join('\n');
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8" /><style>@font-face{font-family:'UTM Avo';font-style:normal;font-weight:400;src:url('${window.location.origin}/fonts/UTMAvo-Regular.ttf') format('truetype');}@font-face{font-family:'UTM Avo';font-style:normal;font-weight:700;src:url('${window.location.origin}/fonts/UTMAvo-Bold.ttf') format('truetype');}</style><style>${styles}@page{size:${pageSize};margin:0;}html,body{margin:0;padding:0;background:white;font-family:'UTM Avo',sans-serif;}</style></head><body>${bodyHTML}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 800); };
  };

  const buildPrintHTML = (targetWorkers: any[]) => {
    const cardHTMLs: string[] = [];
    targetWorkers.forEach((w) => {
      const cardEl = document.querySelector(`[data-worker-id="${w.id}"]`);
      if (cardEl) cardHTMLs.push(cardEl.innerHTML);
    });
    if (cardHTMLs.length === 0) return null;
    const cardsPerPage = 10;
    const pages: string[][] = [];
    for (let i = 0; i < cardHTMLs.length; i += cardsPerPage) pages.push(cardHTMLs.slice(i, i + cardsPerPage));
    return pages.map((pageCards, pi) => {
      const cells = Array.from({ length: cardsPerPage }, (_, i) => {
        const html = pageCards[i] || '';
        return `<div style="width:85.6mm;height:54mm;overflow:hidden;flex-shrink:0;${html ? '' : 'visibility:hidden;'}">${html}</div>`;
      }).join('');
      return `<div style="width:210mm;height:297mm;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:4mm;padding:5.5mm 17.4mm;box-sizing:border-box;page-break-after:${pi < pages.length - 1 ? 'always' : 'auto'};background:white;">${cells}</div>`;
    }).join('');
  };

  // ── In lần đầu (approved → issued) ──────────────────────────────────────
  const handlePrintSuccess = async (workerIds: string[]) => {
    try {
      await updateCardStatusBulkAction(workerIds, 'issued');
      setCheckedIds(new Set());
      fetchWorkers();
    } catch (e) { console.error(e); }
  };

  const handlePrintSingle = () => {
    if (!selectedWorker) return;
    const cardElement = document.getElementById('card-preview');
    if (!cardElement) return;
    const bodyHTML = `<div style="width:85.6mm;height:54mm;display:flex;align-items:center;justify-content:center;">${cardElement.innerHTML}</div>`;
    openPrintWindow(bodyHTML, '85.6mm 54mm');
    if (selectedWorker.card_status === 'approved') {
      handlePrintSuccess([selectedWorker.id]);
    } else {
      toast.success('Đã in lại thẻ!');
    }
  };

  const handlePrintBulk = () => {
    const targetWorkers = checkedIds.size > 0
      ? workers.filter((w) => checkedIds.has(w.id) && w.card_status === 'approved')
      : workers.filter((w) => w.card_status === 'approved');
    if (targetWorkers.length === 0) { toast.error('Không có thẻ nào cần in!'); return; }
    const html = buildPrintHTML(targetWorkers);
    if (!html) { toast.error('Không thể lấy dữ liệu thẻ để in!'); return; }
    openPrintWindow(html, 'A4 portrait');
    handlePrintSuccess(targetWorkers.map((w: any) => w.id));
    toast.success(`Đang in ${targetWorkers.length} thẻ...`);
  };

  // ── In lại (issued, không đổi status) ───────────────────────────────────
  const handleReprint = () => {
    const targetWorkers = checkedIds.size > 0
      ? workers.filter((w) => checkedIds.has(w.id) && w.card_status === 'issued')
      : workers.filter((w) => w.card_status === 'issued');
    if (targetWorkers.length === 0) { toast.error('Chưa chọn thẻ nào để in lại!'); return; }
    const html = buildPrintHTML(targetWorkers);
    if (!html) { toast.error('Không thể lấy dữ liệu thẻ để in!'); return; }
    openPrintWindow(html, 'A4 portrait');
    toast.success(`Đang in lại ${targetWorkers.length} thẻ...`);
    setCheckedIds(new Set());
  };

  // ── Checkbox helpers ─────────────────────────────────────────────────────
  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const eligibleWorkers = printMode === 'reprint'
    ? filteredWorkers().filter((w: any) => w.card_status === 'issued')
    : filteredWorkers().filter((w: any) => w.card_status === 'approved');

  function filteredWorkers() {
    if (filterStatus === 'all') return workers;
    return workers.filter(w => w.card_status === filterStatus);
  }

  const toggleAll = () => {
    const eligible = eligibleWorkers;
    const allSelected = eligible.length > 0 && eligible.every((w: any) => checkedIds.has(w.id));
    if (allSelected) {
      setCheckedIds(prev => { const next = new Set(prev); eligible.forEach((w: any) => next.delete(w.id)); return next; });
    } else {
      setCheckedIds(prev => { const next = new Set(prev); eligible.forEach((w: any) => next.add(w.id)); return next; });
    }
  };

  const cardData = selectedWorker ? buildCardData(selectedWorker) : null;
  const fWorkers = filteredWorkers();
  const allChecked = eligibleWorkers.length > 0 && eligibleWorkers.every((w: any) => checkedIds.has(w.id));
  const isReprintMode = printMode === 'reprint';
  const approvedCount = workers.filter(w => w.card_status === 'approved').length;
  const issuedCount = workers.filter(w => w.card_status === 'issued').length;

  return (
    <div className="p-6 space-y-6">

      {/* ===== PAGE HEADER ===== */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quản Lý Thẻ Ra Vào</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="font-semibold text-brand-blue">{workers.length}</span> thẻ trong hệ thống
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchWorkers} className="gap-1.5 text-gray-600">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </Button>

          {/* Toggle Print / Reprint mode */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setPrintMode('print')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                !isReprintMode ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Printer className="h-3.5 w-3.5" />
              In thẻ
              {approvedCount > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {approvedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setPrintMode('reprint')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                isReprintMode ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              In lại
              {issuedCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {issuedCount}
                </span>
              )}
            </button>
          </div>

          {/* Print action button */}
          {!isReprintMode ? (
            <>
              <Button variant="outline" size="sm" onClick={handlePrintSingle} disabled={!cardData} className="gap-1.5 text-brand-blue border-brand-blue/40 hover:bg-brand-blue/5">
                <Printer className="h-4 w-4" /> In thẻ này
              </Button>
              <Button size="sm" onClick={handlePrintBulk} disabled={approvedCount === 0} className="gap-1.5 text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
                <PrinterCheck className="h-4 w-4" />
                {checkedIds.size > 0 ? `In ${checkedIds.size} thẻ đã chọn` : `In tất cả (${approvedCount})`}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handlePrintSingle} disabled={!cardData} className="gap-1.5 text-amber-600 border-amber-400/40 hover:bg-amber-50">
                <RotateCcw className="h-4 w-4" /> In lại thẻ này
              </Button>
              <Button
                size="sm"
                onClick={handleReprint}
                disabled={issuedCount === 0}
                className="gap-1.5 text-white"
                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
              >
                <RotateCcw className="h-4 w-4" />
                {checkedIds.size > 0 ? `In lại ${checkedIds.size} thẻ đã chọn` : `In lại tất cả (${issuedCount})`}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ===== REPRINT MODE BANNER ===== */}
      {isReprintMode && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
          <RotateCcw className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Chế độ In Lại</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Chọn các thẻ <strong>đã cấp</strong> cần in lại. Trạng thái thẻ sẽ không thay đổi sau khi in lại.
            </p>
          </div>
          <button onClick={() => setPrintMode('print')} className="text-amber-500 hover:text-amber-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 lg:h-[calc(100vh-200px)] pb-6 lg:pb-0">

        {/* Card Preview - 3 cols */}
        <div className="lg:col-span-3 order-2 lg:order-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #1e3a8a, #970731)' }} />
              <h2 className="font-semibold text-gray-800">Bản Xem Trước</h2>
            </div>
            {selectedWorker && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-brand-blue font-medium border border-blue-100">Thẻ Ngang</span>
                {isReprintMode && selectedWorker.card_status === 'issued' && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 font-medium border border-amber-200 flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Đã cấp
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 flex justify-center items-center bg-gray-50 p-6 lg:p-10 min-h-[350px] lg:min-h-0 overflow-hidden">
            {cardData ? (
              <div id="card-preview" className="drop-shadow-2xl scale-75 sm:scale-90 lg:scale-100 origin-center">
                <CardTemplate data={cardData} layout="horizontal" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-300">
                <CreditCard className="w-16 h-16" />
                <p className="text-sm">Chọn một công nhân để xem trước thẻ</p>
              </div>
            )}
          </div>
        </div>

        {/* Worker List - 2 cols */}
        <div className="lg:col-span-2 order-1 lg:order-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[450px] lg:h-auto">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #1e3a8a, #970731)' }} />
                <h2 className="font-semibold text-gray-800">Danh Sách Thẻ</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-brand-blue border border-blue-100 font-medium">{fWorkers.length}</span>
              </div>
              {/* Chọn tất cả — hiện khi có thẻ eligible */}
              {eligibleWorkers.length > 0 && (
                <button
                  onClick={toggleAll}
                  className={`text-xs font-medium flex items-center gap-1 transition-colors ${
                    isReprintMode ? 'text-amber-600 hover:text-amber-700' : 'text-brand-blue hover:text-brand-blue/70'
                  }`}
                >
                  {allChecked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  {allChecked ? 'Bỏ chọn tất cả' : `Chọn tất cả (${eligibleWorkers.length})`}
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex bg-gray-100/50 p-1 rounded-lg">
              {['all', 'pending', 'approved', 'issued'].map(status => {
                const labels: any = { all: 'Tất cả', pending: 'Chờ duyệt', approved: 'Chờ in', issued: 'Đã cấp' };
                const active = filterStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                      active ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {labels[status]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selection Banner */}
          {checkedIds.size > 0 && (
            <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
              isReprintMode
                ? 'bg-amber-50 border border-amber-200 text-amber-700'
                : 'bg-blue-50 border border-blue-100 text-brand-blue'
            }`}>
              <span>
                {isReprintMode ? <RotateCcw className="h-3 w-3 inline mr-1" /> : <Printer className="h-3 w-3 inline mr-1" />}
                Đã chọn <strong>{checkedIds.size}</strong> thẻ để {isReprintMode ? 'in lại' : 'in'}
              </span>
              <button
                onClick={() => setCheckedIds(new Set())}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Worker List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center gap-2 text-gray-300 py-16">
                <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Đang tải...</span>
              </div>
            ) : fWorkers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 text-gray-300 py-16">
                <CreditCard className="w-12 h-12" />
                <div className="text-center">
                  <p className="text-sm text-gray-500 font-medium">Danh sách trống</p>
                  <p className="text-xs text-gray-400 mt-1">Không có thẻ nào trong trạng thái này</p>
                </div>
              </div>
            ) : (
              fWorkers.map((w) => {
                const isEligible = isReprintMode ? w.card_status === 'issued' : w.card_status === 'approved';
                const isChecked = checkedIds.has(w.id);
                return (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWorker(w)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedWorker?.id === w.id
                        ? 'border-brand-blue/40 bg-blue-50/60 ring-1 ring-brand-blue/20'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    } ${isChecked
                        ? isReprintMode
                          ? 'border-amber-300 bg-amber-50/60'
                          : 'border-emerald-300 bg-emerald-50/60'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox — hiện nếu đủ điều kiện */}
                      {isEligible && (
                        <button onClick={(e) => toggleCheck(w.id, e)} className="shrink-0">
                          {isChecked ? (
                            <CheckSquare className={`h-4 w-4 ${isReprintMode ? 'text-amber-600' : 'text-emerald-600'}`} />
                          ) : (
                            <Square className="h-4 w-4 text-gray-300 hover:text-gray-400" />
                          )}
                        </button>
                      )}

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-brand-blue to-brand-red flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                        {w.portrait_url ? (
                          <img src={w.portrait_url} className="w-full h-full object-cover" alt={w.full_name} />
                        ) : (
                          <span className="text-white text-xs font-bold">{w.full_name?.charAt(0)}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{w.full_name}</p>
                        <p className="text-xs text-gray-400">MNV: {w.mnv} · {w.team}</p>
                      </div>

                      {/* Status badge */}
                      <div className="flex items-center gap-1 shrink-0">
                        {w.card_status === 'pending' && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-medium">Chờ duyệt</span>}
                        {w.card_status === 'approved' && <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">Chờ in</span>}
                        {w.card_status === 'issued' && (
                          <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${
                            isReprintMode && isChecked
                              ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                          }`}>
                            {isReprintMode && isChecked && <RotateCcw className="h-2.5 w-2.5" />}
                            Đã cấp
                          </span>
                        )}
                        {selectedWorker?.id === w.id && <ChevronRight className="w-4 h-4 text-brand-blue" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Hidden render for bulk print */}
      <div className="absolute opacity-0 pointer-events-none -z-50 -top-[9999px] -left-[9999px]">
        {workers.map((w) => (
          <div key={w.id} data-worker-id={w.id}>
            <CardTemplate data={buildCardData(w)} layout="horizontal" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { CardTemplate, CardData } from '@/components/cards/CardTemplate';
import { Printer, RefreshCw, CheckSquare, Square, PrinterCheck, CreditCard, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { updateCardStatusBulkAction } from '@/app/actions/worker';

export default function CardsPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => { fetchWorkers(); }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .in('card_status', ['pending', 'approved', 'issued'])
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Lỗi khi tải dữ liệu thẻ');
    } else if (data && data.length > 0) {
      setWorkers(data);
      setSelectedWorker(data[0]);
    } else {
      setWorkers([]);
    }
    setLoading(false);
  };

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

  const openPrintWindow = (bodyHTML: string, pageSize: string) => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) { toast.error('Vui lòng cho phép mở popup để in thẻ!'); return; }

    const styles = Array.from(document.styleSheets)
      .map((sheet) => { try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n'); } catch { return ''; } })
      .join('\n');

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8" /><style>@font-face{font-family:'UTM Avo';font-style:normal;font-weight:400;src:url('${window.location.origin}/fonts/UTMAvo-Regular.ttf') format('truetype');}@font-face{font-family:'UTM Avo';font-style:normal;font-weight:700;src:url('${window.location.origin}/fonts/UTMAvo-Bold.ttf') format('truetype');}</style><style>${styles}@page{size:${pageSize};margin:0;}html,body{margin:0;padding:0;background:white;font-family:'UTM Avo',sans-serif;}</style></head><body>${bodyHTML}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); toast.success('Đã in và cập nhật trạng thái thẻ!'); }, 800); };
  };

  const handlePrintSuccess = async (workerIds: string[]) => {
    try {
      await updateCardStatusBulkAction(workerIds, 'issued');
      setCheckedIds(new Set());
      fetchWorkers();
    } catch (e) { console.error(e); }
  };

  const handlePrintSingle = () => {
    if (!selectedWorker) return;
    const cardElement = document.getElementById('card-preview');
    if (!cardElement) return;
    const bodyHTML = `<div style="width:85.6mm;height:54mm;display:flex;align-items:center;justify-content:center;">${cardElement.innerHTML}</div>`;
    openPrintWindow(bodyHTML, '85.6mm 54mm');
    handlePrintSuccess([selectedWorker.id]);
  };

  const handlePrintBulk = () => {
    const targetWorkers = checkedIds.size > 0 ? workers.filter((w) => checkedIds.has(w.id)) : workers;
    if (targetWorkers.length === 0) { toast.error('Không có công nhân nào để in!'); return; }
    const cardHTMLs: string[] = [];
    targetWorkers.forEach((w) => {
      const cardEl = document.querySelector(`[data-worker-id="${w.id}"]`);
      if (cardEl) cardHTMLs.push(cardEl.innerHTML);
    });
    if (cardHTMLs.length === 0) { toast.error('Không thể lấy dữ liệu thẻ để in!'); return; }
    const cardsPerPage = 10;
    const pages: string[][] = [];
    for (let i = 0; i < cardHTMLs.length; i += cardsPerPage) pages.push(cardHTMLs.slice(i, i + cardsPerPage));
    const pagesHTML = pages.map((pageCards, pi) => {
      const cells = Array.from({ length: cardsPerPage }, (_, i) => {
        const html = pageCards[i] || '';
        return `<div style="width:85.6mm;height:54mm;overflow:hidden;flex-shrink:0;${html ? '' : 'visibility:hidden;'}">${html}</div>`;
      }).join('');
      return `<div style="width:210mm;height:297mm;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:4mm;padding:5.5mm 17.4mm;box-sizing:border-box;page-break-after:${pi < pages.length - 1 ? 'always' : 'auto'};background:white;">${cells}</div>`;
    }).join('');
    openPrintWindow(pagesHTML, 'A4 portrait');
    handlePrintSuccess(targetWorkers.map((w: any) => w.id));
  };

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleAll = () => {
    if (checkedIds.size === workers.length) setCheckedIds(new Set());
    else setCheckedIds(new Set(workers.map((w) => w.id)));
  };

  const cardData = selectedWorker ? buildCardData(selectedWorker) : null;
  const filteredWorkers = filterStatus === 'all' ? workers : workers.filter(w => w.card_status === filterStatus);
  const allChecked = filteredWorkers.length > 0 && checkedIds.size === filteredWorkers.length;

  return (
    <div className="p-6 space-y-6">

      {/* ===== PAGE HEADER ===== */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quản Lý Thẻ Ra Vào</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="font-semibold text-brand-blue">{workers.length}</span> thẻ trong hệ thống
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchWorkers} className="gap-1.5 text-gray-600">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrintSingle} disabled={!cardData} className="gap-1.5 text-brand-blue border-brand-blue/40 hover:bg-brand-blue/5">
            <Printer className="h-4 w-4" /> In thẻ này
          </Button>
          <Button size="sm" onClick={handlePrintBulk} disabled={workers.length === 0} className="gap-1.5 text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
            <PrinterCheck className="h-4 w-4" />
            {checkedIds.size > 0 ? `In ${checkedIds.size} thẻ đã chọn` : `In tất cả (${workers.length})`}
          </Button>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 lg:h-[calc(100vh-160px)] pb-6 lg:pb-0">

        {/* Card Preview - 3 cols */}
        <div className="lg:col-span-3 order-2 lg:order-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #1e3a8a, #970731)' }} />
              <h2 className="font-semibold text-gray-800">Bản Xem Trước</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-brand-blue font-medium border border-blue-100">Thẻ Ngang</span>
          </div>
          <div className="flex-1 flex justify-center items-center bg-gray-50 p-6 lg:p-10 min-h-[350px] lg:min-h-0 overflow-hidden">
            {cardData ? (
              <div id="card-preview" className="drop-shadow-2xl scale-75 sm:scale-90 lg:scale-100 origin-center">
                <CardTemplate data={cardData} layout="horizontal" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-300">
                <CreditCard className="w-16 h-16" />
                <p className="text-sm">Chọn một công nhân để xem trước thẻ</p>
              </div>
            )}
          </div>
        </div>

        {/* Worker List - 2 cols */}
        <div className="lg:col-span-2 order-1 lg:order-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[450px] lg:h-auto">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #1e3a8a, #970731)' }} />
                <h2 className="font-semibold text-gray-800">Danh Sách Thẻ</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-brand-blue border border-blue-100 font-medium">{filteredWorkers.length}</span>
              </div>
              {filteredWorkers.length > 0 && filterStatus === 'approved' && (
                <button onClick={toggleAll} className="text-xs text-brand-blue hover:text-brand-blue/70 font-medium flex items-center gap-1">
                  {allChecked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  {allChecked ? 'Bỏ chọn' : 'Chọn tất cả'}
                </button>
              )}
            </div>
            
            {/* Simple Status Filter */}
            <div className="flex bg-gray-100/50 p-1 rounded-lg">
              {['all', 'pending', 'approved', 'issued'].map(status => {
                const labels: any = { all: 'Tất cả', pending: 'Chờ duyệt', approved: 'Chờ in', issued: 'Đã cấp' };
                const active = filterStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => { setFilterStatus(status); setCheckedIds(new Set()); }}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                      active ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {labels[status]}
                  </button>
                );
              })}
            </div>
          </div>

          {checkedIds.size > 0 && (
            <div className="mx-4 mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-brand-blue font-medium">
              Đã chọn <strong>{checkedIds.size}</strong> / {workers.length} thẻ để in hàng loạt
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center gap-2 text-gray-300 py-16">
                <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Đang tải...</span>
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 text-gray-300 py-16">
                <CreditCard className="w-12 h-12" />
                <div className="text-center">
                  <p className="text-sm text-gray-500 font-medium">Danh sách trống</p>
                  <p className="text-xs text-gray-400 mt-1">Không có thẻ nào trong trạng thái này</p>
                </div>
              </div>
            ) : (
              filteredWorkers.map((w) => (
                <div
                  key={w.id}
                  onClick={() => setSelectedWorker(w)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedWorker?.id === w.id
                      ? 'border-brand-blue/40 bg-blue-50/60 ring-1 ring-brand-blue/20'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  } ${checkedIds.has(w.id) ? 'border-emerald-300 bg-emerald-50/60' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {w.card_status === 'approved' && (
                      <button
                        onClick={(e) => toggleCheck(w.id, e)}
                        className="shrink-0"
                      >
                        {checkedIds.has(w.id) ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-300 hover:text-gray-400" />
                        )}
                      </button>
                    )}
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-brand-blue to-brand-red flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                      {w.portrait_url ? (
                        <img src={w.portrait_url} className="w-full h-full object-cover" alt={w.full_name} />
                      ) : (
                        <span className="text-white text-xs font-bold">{w.full_name?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{w.full_name}</p>
                      <p className="text-xs text-gray-400">MNV: {w.mnv} · {w.team}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {w.card_status === 'pending' && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-medium">Chờ duyệt</span>}
                      {w.card_status === 'approved' && <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">Chờ in</span>}
                      {w.card_status === 'issued' && <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">Đã cấp</span>}
                      {selectedWorker?.id === w.id && <ChevronRight className="w-4 h-4 text-brand-blue" />}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Hidden render for bulk print */}
      <div className="absolute opacity-0 pointer-events-none -z-50 -top-[9999px] -left-[9999px]">
        {workers.map((w) => (
          <div key={w.id} data-worker-id={w.id}>
            <CardTemplate data={buildCardData(w)} layout="horizontal" />
          </div>
        ))}
      </div>
    </div>
  );
}
