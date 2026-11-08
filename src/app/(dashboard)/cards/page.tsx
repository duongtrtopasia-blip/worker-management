'use client';

import React, { useState, useEffect, useDeferredValue, useMemo } from 'react';
import Link from 'next/link';
import { CardTemplate, CardData } from '@/components/cards/CardTemplate';
import {
  Printer,
  RefreshCw,
  CheckSquare,
  Square,
  PrinterCheck,
  CreditCard,
  ChevronRight,
  RotateCcw,
  X,
  Search,
} from 'lucide-react';
import {
  fetchWorkersCached,
  getCachedWorkers,
  invalidateDataCache,
  updateCachedWorkers,
} from '@/lib/data-cache';
import toast from 'react-hot-toast';
import { updateCardStatusBulkAction } from '@/app/actions/worker';

type PrintMode = 'print' | 'reprint';

function filterCardWorkers(all: any[]) {
  return all.filter((w) => ['pending', 'approved', 'issued'].includes(w.card_status));
}

export default function CardsPage() {
  const cachedAll = getCachedWorkers();
  const initialCardWorkers = cachedAll ? filterCardWorkers(cachedAll) : [];
  const [workers, setWorkers] = useState<any[]>(initialCardWorkers);
  const [selectedWorker, setSelectedWorker] = useState<any>(initialCardWorkers[0] || null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(!cachedAll);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [printMode, setPrintMode] = useState<PrintMode>('print');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    fetchWorkers(false);
  }, []);
  useEffect(() => {
    setCheckedIds(new Set());
  }, [filterStatus, printMode, deferredSearchQuery]);

  const fetchWorkers = async (force = true) => {
    if (force) {
      invalidateDataCache();
      if (workers.length === 0) setLoading(true);
    }

    try {
      const allData = await fetchWorkersCached(force);
      const cardWorkers = filterCardWorkers(allData);
      if (cardWorkers.length > 0) {
        setWorkers(cardWorkers);
        setSelectedWorker((prev: any) =>
          prev && cardWorkers.some((w) => w.id === prev.id) ? prev : cardWorkers[0]
        );
      } else {
        setWorkers([]);
        setSelectedWorker(null);
      }
    } catch {
      toast.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
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
    if (!printWindow) {
      toast.error('Vui lòng cho phép mở popup để in thẻ!');
      return;
    }
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((r) => r.cssText)
            .join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');
    const origin = window.location.origin;
    printWindow.document.write(
      `<!DOCTYPE html><html><head><meta charset="UTF-8" /><base href="${origin}" /><style>@font-face{font-family:'UTM Avo';font-style:normal;font-weight:400;src:url('${origin}/fonts/UTMAvo-Regular.ttf') format('truetype');}@font-face{font-family:'UTM Avo';font-style:normal;font-weight:700;src:url('${origin}/fonts/UTMAvo-Bold.ttf') format('truetype');}</style><style>${styles}@page{size:${pageSize};margin:0;}html,body{margin:0;padding:0;background:white;font-family:'UTM Avo',sans-serif;}:root{--color-brand-blue:#1e3a8a;--color-brand-red:#970731;--color-brand-maroon:#7f1d1d;}.text-brand-blue{color:#1e3a8a!important;}.text-brand-red{color:#970731!important;}.text-brand-maroon{color:#7f1d1d!important;}.border-brand-blue{border-color:#1e3a8a!important;}.border-brand-blue\\/30{border-color:rgba(30,58,138,0.3)!important;}.border-brand-red\\/20{border-color:rgba(151,7,49,0.2)!important;}</style></head><body>${bodyHTML}</body></html>`
    );
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 800);
    };
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
    for (let i = 0; i < cardHTMLs.length; i += cardsPerPage)
      pages.push(cardHTMLs.slice(i, i + cardsPerPage));
    return pages
      .map((pageCards, pi) => {
        const cells = Array.from({ length: cardsPerPage }, (_, ci) => {
          const html = pageCards[ci] || '';
          return `<div style="width:85.6mm;height:54mm;overflow:hidden;flex-shrink:0;${
            html ? '' : 'visibility:hidden;'
          }">${html}</div>`;
        }).join('');
        return `<div style="width:210mm;height:297mm;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:4mm;padding:5.5mm 17.4mm;box-sizing:border-box;page-break-after:${
          pi < pages.length - 1 ? 'always' : 'auto'
        };background:white;">${cells}</div>`;
      })
      .join('');
  };

  const handlePrintSuccess = async (workerIds: string[]) => {
    try {
      await updateCardStatusBulkAction(workerIds, 'issued');
      setCheckedIds(new Set());
      fetchWorkers();
    } catch (e) {
      console.error(e);
    }
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
    const target =
      checkedIds.size > 0
        ? workers.filter((w) => checkedIds.has(w.id) && w.card_status === 'approved')
        : workers.filter((w) => w.card_status === 'approved');
    if (target.length === 0) {
      toast.error('Không có thẻ nào cần in!');
      return;
    }
    const html = buildPrintHTML(target);
    if (!html) {
      toast.error('Không thể lấy dữ liệu thẻ!');
      return;
    }
    openPrintWindow(html, 'A4 portrait');
    handlePrintSuccess(target.map((w: any) => w.id));
    toast.success(`Đang in ${target.length} thẻ...`);
  };

  const handleReprint = () => {
    const target =
      checkedIds.size > 0
        ? workers.filter((w) => checkedIds.has(w.id) && w.card_status === 'issued')
        : workers.filter((w) => w.card_status === 'issued');
    if (target.length === 0) {
      toast.error('Chưa chọn thẻ nào để in lại!');
      return;
    }
    const html = buildPrintHTML(target);
    if (!html) {
      toast.error('Không thể lấy dữ liệu thẻ!');
      return;
    }
    openPrintWindow(html, 'A4 portrait');
    toast.success(`Đang in lại ${target.length} thẻ...`);
    setCheckedIds(new Set());
  };

  const fWorkers = useMemo(() => {
    let filtered = workers;
    if (filterStatus !== 'all') {
      filtered = filtered.filter((w) => w.card_status === filterStatus);
    }
    if (deferredSearchQuery) {
      const query = deferredSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.cccd?.toLowerCase().includes(query) ||
          w.full_name?.toLowerCase().includes(query) ||
          w.mnv?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [workers, filterStatus, deferredSearchQuery]);

  const eligible = useMemo(() => {
    return printMode === 'reprint'
      ? fWorkers.filter((w: any) => w.card_status === 'issued')
      : fWorkers.filter((w: any) => w.card_status === 'approved');
  }, [fWorkers, printMode]);

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const allSel = eligible.length > 0 && eligible.every((w: any) => checkedIds.has(w.id));
    if (allSel) {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        eligible.forEach((w: any) => next.delete(w.id));
        return next;
      });
    } else {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        eligible.forEach((w: any) => next.add(w.id));
        return next;
      });
    }
  };

  const allChecked = eligible.length > 0 && eligible.every((w: any) => checkedIds.has(w.id));
  const isReprintMode = printMode === 'reprint';
  const approvedCount = workers.filter((w) => w.card_status === 'approved').length;
  const issuedCount = workers.filter((w) => w.card_status === 'issued').length;
  const cardData = selectedWorker ? buildCardData(selectedWorker) : null;

  return (
    <div style={{ padding: '24px 28px' }} className="max-w-[1360px] mx-auto space-y-5">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f1b33' }}>
            Quản lý &amp; In thẻ công trường
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5b6577' }}>
            Tổng số{' '}
            <strong className="text-[#1e3a8a]">{workers.length.toLocaleString('vi-VN')}</strong> thẻ
            trong danh sách cấp phát
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button type="button" onClick={() => fetchWorkers(true)} className="btn-secondary">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          {/* Mode toggle */}
          <div
            style={{
              display: 'flex',
              background: '#eef1f5',
              borderRadius: '8px',
              padding: '3px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setPrintMode('print')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                !isReprintMode
                  ? 'bg-white text-[#1e3a8a] shadow-sm'
                  : 'text-[#5b6577] hover:text-[#0f1b33]'
              }`}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>In thẻ</span>
              {approvedCount > 0 && (
                <span
                  style={{ background: '#047857', color: '#ffffff' }}
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                >
                  {approvedCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('reprint')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                isReprintMode
                  ? 'bg-white text-[#92400e] shadow-sm'
                  : 'text-[#5b6577] hover:text-[#0f1b33]'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>In lại</span>
              {issuedCount > 0 && (
                <span
                  style={{ background: '#d97706', color: '#ffffff' }}
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                >
                  {issuedCount}
                </span>
              )}
            </button>
          </div>

          {!isReprintMode ? (
            <>
              <button
                type="button"
                onClick={handlePrintSingle}
                disabled={!cardData}
                className="btn-secondary"
              >
                <Printer className="h-4 w-4" />
                <span>In thẻ này</span>
              </button>
              <button
                type="button"
                onClick={handlePrintBulk}
                disabled={approvedCount === 0}
                className="btn-primary"
              >
                <PrinterCheck className="h-4 w-4" />
                <span>
                  {checkedIds.size > 0
                    ? `In ${checkedIds.size} thẻ đã chọn`
                    : `In hàng loạt (${approvedCount})`}
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handlePrintSingle}
                disabled={!cardData}
                className="btn-secondary"
              >
                <RotateCcw className="h-4 w-4" />
                <span>In lại thẻ này</span>
              </button>
              <button
                type="button"
                onClick={handleReprint}
                disabled={issuedCount === 0}
                className="btn-primary"
                style={{ background: '#d97706' }}
              >
                <RotateCcw className="h-4 w-4" />
                <span>
                  {checkedIds.size > 0
                    ? `In lại ${checkedIds.size} thẻ đã chọn`
                    : `In lại tất cả (${issuedCount})`}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Format Switch Strip (Cards.dc.html) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e3e8ef',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#5b6577',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginRight: '4px',
            }}
          >
            Loại mẫu in:
          </span>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#eef2fb',
              border: '1px solid #1e3a8a',
              color: '#1e3a8a',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            Thẻ ra vào nhựa (CR80)
          </span>
          <Link
            href="/helmet-tags"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #e3e8ef',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
            }}
            className="no-underline hover:bg-[#f7f9fc]"
          >
            Tem Mũ bảo hộ (Sticker)
          </Link>
          <Link
            href="/meal-cards"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #e3e8ef',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
            }}
            className="no-underline hover:bg-[#f7f9fc]"
          >
            Phiếu nhận Cơm ca
          </Link>
        </div>
        <span style={{ fontSize: '12px', color: '#5b6577' }}>
          Khổ giấy: <strong className="text-[#0f1b33]">A4 (10 thẻ / trang)</strong> hoặc{' '}
          <strong className="text-[#0f1b33]">CR80 (85.6 × 54 mm)</strong>
        </span>
      </div>

      {/* REPRINT BANNER */}
      {isReprintMode && (
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            borderRadius: '10px',
            border: '1px solid #d97706',
            background: '#fdf3dc',
          }}
        >
          <RotateCcw className="h-5 w-5 text-[#92400e] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-[#92400e]">Chế độ In Lại</p>
            <p className="text-xs text-[#92400e] mt-0.5">
              Chọn các thẻ <strong>đã cấp</strong> cần in lại. Trạng thái thẻ sẽ không thay đổi.
            </p>
          </div>
          <button
            onClick={() => setPrintMode('print')}
            className="text-[#92400e] hover:opacity-75"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* MAIN CONTENT (Cards.dc.html 2-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 lg:h-[calc(100vh-260px)] min-h-[520px]">
        {/* LEFT: WORKER SELECTION & PRINT QUEUE */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e3e8ef',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(15,27,51,0.05)',
          }}
          className="flex flex-col overflow-hidden h-[480px] lg:h-auto"
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e3e8ef' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f1b33' }}>
                  Danh sách thẻ
                </span>
                <span
                  className="scmp-badge"
                  style={{ background: '#eef2fb', color: '#1e3a8a' }}
                >
                  {fWorkers.length}
                </span>
              </div>
              {eligible.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="text-xs font-bold flex items-center gap-1 transition-colors"
                  style={{ color: isReprintMode ? '#92400e' : '#1e3a8a' }}
                >
                  {allChecked ? (
                    <CheckSquare className="h-3.5 w-3.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  {allChecked ? 'Bỏ chọn tất cả' : `Chọn tất cả (${eligible.length})`}
                </button>
              )}
            </div>

            {/* Status Tabs */}
            <div
              style={{
                display: 'flex',
                background: '#eef1f5',
                padding: '3px',
                borderRadius: '8px',
                marginBottom: '12px',
              }}
            >
              {(['all', 'pending', 'approved', 'issued'] as const).map((status) => {
                const labels = {
                  all: 'Tất cả',
                  pending: 'Chờ duyệt',
                  approved: 'Chờ in',
                  issued: 'Đã cấp',
                };
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${
                      filterStatus === status
                        ? 'bg-white text-[#1e3a8a] shadow-sm'
                        : 'text-[#5b6577] hover:text-[#0f1b33]'
                    }`}
                  >
                    {labels[status]}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7586]" />
              <input
                type="text"
                placeholder="Tìm thẻ theo CCCD, tên, MNV..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 12px 0 34px',
                  border: '1px solid #8592a4',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: '#ffffff',
                  color: '#0f1b33',
                }}
                className="outline-none focus:!border-[#1e3a8a]"
              />
            </div>
          </div>

          {checkedIds.size > 0 && (
            <div
              className="mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between"
              style={
                isReprintMode
                  ? { background: '#fdf3dc', border: '1px solid #d97706', color: '#92400e' }
                  : { background: '#eef2fb', border: '1px solid #c9d4f0', color: '#1e3a8a' }
              }
            >
              <span>
                Đã chọn <strong>{checkedIds.size}</strong> thẻ để {isReprintMode ? 'in lại' : 'in'}
              </span>
              <button onClick={() => setCheckedIds(new Set())} className="hover:opacity-70">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-16">
                <div className="w-8 h-8 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-[#5b6577]">Đang tải...</span>
              </div>
            ) : fWorkers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <CreditCard className="w-12 h-12 text-[#c5cedb]" />
                <p className="text-sm text-[#5b6577] font-medium">Danh sách trống</p>
              </div>
            ) : (
              fWorkers.map((w) => {
                const isEligible = isReprintMode
                  ? w.card_status === 'issued'
                  : w.card_status === 'approved';
                const isChecked = checkedIds.has(w.id);
                const isSelected = selectedWorker?.id === w.id;
                return (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWorker(w)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: isSelected
                        ? '1px solid #1e3a8a'
                        : isChecked
                        ? '1px solid #047857'
                        : '1px solid #e3e8ef',
                      background: isSelected
                        ? '#eef2fb'
                        : isChecked
                        ? '#e6f5ee'
                        : '#ffffff',
                      cursor: 'pointer',
                    }}
                    className="hover:bg-[#f7f9fc] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isEligible && (
                        <button onClick={(e) => toggleCheck(w.id, e)} className="shrink-0">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-[#1e3a8a]" />
                          ) : (
                            <Square className="h-4 w-4 text-[#8592a4]" />
                          )}
                        </button>
                      )}
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#1e3a8a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {w.portrait_url ? (
                          <img
                            src={w.portrait_url}
                            className="w-full h-full object-cover"
                            alt={w.full_name}
                          />
                        ) : (
                          <span className="text-white text-xs font-bold">
                            {w.full_name?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[#0f1b33] truncate">{w.full_name}</p>
                        <p className="text-xs text-[#5b6577] truncate">
                          MNV: {w.mnv} · {w.team}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {w.card_status === 'pending' && (
                          <span
                            className="scmp-badge"
                            style={{ background: '#fdf3dc', color: '#92400e' }}
                          >
                            Chờ duyệt
                          </span>
                        )}
                        {w.card_status === 'approved' && (
                          <span
                            className="scmp-badge"
                            style={{ background: '#e6f5ee', color: '#047857' }}
                          >
                            Chờ in
                          </span>
                        )}
                        {w.card_status === 'issued' && (
                          <span
                            className="scmp-badge"
                            style={{ background: '#eef2fb', color: '#1e3a8a' }}
                          >
                            Đã cấp
                          </span>
                        )}
                        {isSelected && <ChevronRight className="w-4 h-4 text-[#1e3a8a]" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: PREVIEW CANVAS (Cards.dc.html) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e3e8ef',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(15,27,51,0.05)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e3e8ef',
              paddingBottom: '16px',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f1b33' }}>
                Xem trước mẫu in thực tế
              </div>
              <div style={{ fontSize: '12px', color: '#5b6577', marginTop: '2px' }}>
                Tỉ lệ chuẩn theo kích thước thẻ nhựa ISO CR80 (85.6 × 54 mm)
              </div>
            </div>
            {selectedWorker && (
              <div className="flex items-center gap-2">
                <span
                  className="scmp-badge"
                  style={{ background: '#eef2fb', color: '#1e3a8a' }}
                >
                  Thẻ Ngang CR80
                </span>
                <Link
                  href={`/workers/${selectedWorker.id}`}
                  style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a' }}
                  className="hover:underline"
                >
                  Xem hồ sơ →
                </Link>
              </div>
            )}
          </div>

          <div
            className="flex-1 flex justify-center items-center p-6 min-h-[340px] overflow-auto rounded-lg"
            style={{ background: '#f7f9fc', border: '1px solid #e3e8ef' }}
          >
            {cardData ? (
              <div
                id="card-preview"
                className="drop-shadow-xl scale-75 sm:scale-90 lg:scale-100 origin-center"
              >
                <CardTemplate data={cardData} layout="horizontal" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-[#5b6577]">
                <CreditCard className="w-14 h-14 text-[#c5cedb]" />
                <p className="text-sm font-medium">Chọn một công nhân để xem trước thẻ</p>
              </div>
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
