'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Download, CheckCircle2, AlertTriangle, XCircle, Loader2,
  Search, ChevronRight, FileText, Shield,
  Heart, CreditCard, ClipboardCheck, X,
} from 'lucide-react';
import {
  fetchWorkersCached,
  fetchDocumentsCached,
  getCachedWorkers,
  getCachedDocuments,
} from '@/lib/data-cache';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

type DocStatus = 'valid' | 'expiring' | 'expired' | 'missing';

const DOC_CONFIG: { key: string; label: string; short: string; icon: React.ReactNode }[] = [
  { key: 'health_certificate',  label: 'Sức Khỏe',   short: 'SK',  icon: <Heart className="w-3.5 h-3.5" /> },
  { key: 'cccd_notarized',      label: 'CCCD',        short: 'CC',  icon: <CreditCard className="w-3.5 h-3.5" /> },
  { key: 'safety_card',         label: 'Thẻ ATLĐ',   short: 'AT',  icon: <Shield className="w-3.5 h-3.5" /> },
  { key: 'safety_test',         label: 'Kiểm Tra',   short: 'KT',  icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
  { key: 'safety_commitment',   label: 'Cam Kết',    short: 'CK',  icon: <FileText className="w-3.5 h-3.5" /> },
];

const STATUS_STYLE: Record<DocStatus, { bg: string; text: string; dot: string; border: string }> = {
  valid:    { bg: 'bg-[#ecfdf5]', text: 'text-[#047857]', dot: 'bg-[#10b981]', border: 'border-[#a7f3d0]' },
  expiring: { bg: 'bg-[#fef7e6]', text: 'text-[#92400e]', dot: 'bg-[#d97706]', border: 'border-[#f5d89a]' },
  expired:  { bg: 'bg-[#fef2f2]', text: 'text-[#b4141a]', dot: 'bg-[#e31c23]', border: 'border-[#f5b5b8]' },
  missing:  { bg: 'bg-[#f3f5f9]', text: 'text-[#5b6577]', dot: 'bg-[#8592a4]', border: 'border-[#e3e8ef]' },
};

function CircularProgress({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct === 100 ? '#10b981' : pct >= 60 ? '#d97706' : '#e31c23';
  return (
    <svg width="56" height="56" className="shrink-0 -rotate-90">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#e3e8ef" strokeWidth="4" />
      <circle
        cx="28" cy="28" r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="28" y="28" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="11" fontWeight="700" className="rotate-90 origin-center"
        style={{ transform: 'rotate(90deg)', transformOrigin: '28px 28px' }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function DocumentsPage() {
  const initialW = getCachedWorkers();
  const initialD = getCachedDocuments();
  const [workers, setWorkers] = useState<any[]>(initialW || []);
  const [docsData, setDocsData] = useState<any[]>(initialD || []);
  const [loading, setLoading] = useState(!(initialW && initialD));
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'problem' | 'complete'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(60);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setVisibleLimit(60);
  }, [searchQuery, filter]);

  const fetchData = async () => {
    try {
      const [wData, dData] = await Promise.all([
        fetchWorkersCached(),
        fetchDocumentsCached(),
      ]);
      setWorkers(wData);
      setDocsData(dData);
    } catch {
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Pre-index documents by `${worker_id}:${doc_type}` -> O(1) lookup instead of O(N*M)
  const docLookup = useMemo(() => {
    const map = new Map<string, any>();
    for (const d of docsData) {
      map.set(`${d.worker_id}:${d.doc_type}`, d);
    }
    return map;
  }, [docsData]);

  // Precompute summaries for all workers once when workers/docsData change
  const summariesMap = useMemo(() => {
    const now = Date.now();
    const computeStatus = (workerId: string, type: string): DocStatus => {
      const doc = docLookup.get(`${workerId}:${type}`);
      if (!doc) return 'missing';
      if (type === 'health_certificate') {
        const issueDate = doc.issue_date || doc.created_at;
        const expiry = new Date(issueDate);
        expiry.setMonth(expiry.getMonth() + 6);
        const diffDays = Math.ceil((expiry.getTime() - now) / (1000 * 3600 * 24));
        if (diffDays <= 0) return 'expired';
        if (diffDays <= 30) return 'expiring';
        return 'valid';
      }
      if (doc.expiry_date) {
        const diffDays = Math.ceil((new Date(doc.expiry_date).getTime() - now) / (1000 * 3600 * 24));
        if (diffDays <= 0) return 'expired';
        if (diffDays <= 30) return 'expiring';
      }
      return 'valid';
    };

    const map = new Map<string, {
      validCount: number;
      total: number;
      hasWarning: boolean;
      hasError: boolean;
      statuses: (typeof DOC_CONFIG[number] & { status: DocStatus })[];
    }>();

    for (const w of workers) {
      let validCount = 0, hasWarning = false, hasError = false;
      const statuses = DOC_CONFIG.map((d) => {
        const status = computeStatus(w.id, d.key);
        if (status === 'valid') validCount++;
        if (status === 'expiring') { hasWarning = true; validCount++; }
        if (status === 'missing' || status === 'expired') hasError = true;
        return { ...d, status };
      });
      map.set(w.id, { validCount, total: DOC_CONFIG.length, hasWarning, hasError, statuses });
    }
    return map;
  }, [workers, docLookup]);

  const getWorkerSummary = (workerId: string) =>
    summariesMap.get(workerId) || {
      validCount: 0,
      total: DOC_CONFIG.length,
      hasWarning: false,
      hasError: true,
      statuses: DOC_CONFIG.map((d) => ({ ...d, status: 'missing' as DocStatus })),
    };

  const filteredWorkers = workers.filter((w) => {
    const q = searchQuery.toLowerCase();
    if (q && !w.full_name?.toLowerCase().includes(q) && !w.mnv?.toLowerCase().includes(q)) return false;
    const s = getWorkerSummary(w.id);
    if (filter === 'problem' && !s.hasError && !s.hasWarning) return false;
    if (filter === 'complete' && (s.hasError || s.hasWarning)) return false;
    return true;
  });

  const totalWorkers = workers.length;
  const missingCount = workers.filter((w) => getWorkerSummary(w.id).hasError).length;
  const warningCount = workers.filter((w) => { const s = getWorkerSummary(w.id); return !s.hasError && s.hasWarning; }).length;
  const completeCount = totalWorkers - missingCount - warningCount;
  const overallPct = totalWorkers === 0 ? 100 : Math.round((completeCount / totalWorkers) * 100);

  const handleExportExcel = () => {
    const rows: any[] = [];
    workers.forEach((w) => {
      const summary = getWorkerSummary(w.id);
      if (summary.hasError || summary.hasWarning) {
        const txt = (s: DocStatus) => ({ missing: 'Thiếu', expired: 'Hết hạn', expiring: 'Sắp hết hạn', valid: 'OK' }[s]);
        rows.push({ 'Họ Tên': w.full_name, 'MNV': w.mnv, 'Tổ Đội': w.team,
          ...Object.fromEntries(summary.statuses.map((s) => [s.label, txt(s.status)])) });
      }
    });
    if (rows.length === 0) { toast.success('Toàn bộ hồ sơ đầy đủ!'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Thiếu Hồ Sơ');
    XLSX.writeFile(wb, 'Danh_Sach_Thieu_Ho_So.xlsx');
  };

  return (
    <div className="min-h-screen bg-[#f3f5f9] p-4 sm:p-7 space-y-6 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-extrabold text-[#0f1b33] tracking-[-0.02em]">Tình trạng hồ sơ pháp lý</h1>
            <p className="text-[13px] text-[#5b6577] mt-1">Theo dõi tiến độ chuẩn hóa 5 loại giấy tờ của {totalWorkers} công nhân</p>
          </div>
          <button
            onClick={handleExportExcel}
            className="btn-secondary"
          >
            <Download className="h-4 w-4 text-[#047857]" />
            Xuất danh sách thiếu hồ sơ (.xlsx)
          </button>
        </div>

        {/* ── KPI Summary Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="kpi-card">
            <div className="flex justify-between items-start">
              <span className="text-[12px] font-bold text-[#5b6577]">Tỷ lệ đầy đủ</span>
              <div className="w-8 h-8 rounded-[8px] bg-[#eef2fb] flex items-center justify-center text-[#1e3a8a]">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-[#0f1b33] leading-none">{overallPct}%</div>
            <div className="text-[11px] font-bold text-[#5b6577]">{completeCount}/{totalWorkers} công nhân hoàn tất</div>
          </div>

          <div className="kpi-card border-l-4 border-l-[#10b981]">
            <div className="flex justify-between items-start">
              <span className="text-[12px] font-bold text-[#5b6577]">Đầy đủ hồ sơ</span>
              <div className="w-8 h-8 rounded-[8px] bg-[#ecfdf5] flex items-center justify-center text-[#047857]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-[#0f1b33] leading-none">{completeCount}</div>
            <div className="text-[11px] font-bold text-[#047857]">Đủ điều kiện cấp thẻ</div>
          </div>

          <div className="kpi-card border-l-4 border-l-[#d97706]">
            <div className="flex justify-between items-start">
              <span className="text-[12px] font-bold text-[#5b6577]">Sắp hết hạn</span>
              <div className="w-8 h-8 rounded-[8px] bg-[#fef7e6] flex items-center justify-center text-[#92400e]">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-[#0f1b33] leading-none">{warningCount}</div>
            <div className="text-[11px] font-bold text-[#92400e]">Cần gia hạn trong 30 ngày</div>
          </div>

          <div className="kpi-card border-l-4 border-l-[#e31c23]">
            <div className="flex justify-between items-start">
              <span className="text-[12px] font-bold text-[#5b6577]">Thiếu / Hết hạn</span>
              <div className="w-8 h-8 rounded-[8px] bg-[#fef2f2] flex items-center justify-center text-[#b4141a]">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-[#0f1b33] leading-none">{missingCount}</div>
            <div className="text-[11px] font-bold text-[#b4141a]">Chưa đủ giấy tờ bắt buộc</div>
          </div>
        </div>

        {/* ── Search + Filter Bar ── */}
        <div className="bg-white rounded-[12px] border border-[#e3e8ef] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(15,27,51,0.04)]">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7586]" />
            <input
              type="text"
              placeholder="Tìm tên hoặc mã NV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-10 bg-white border border-[#8592a4] rounded-[10px] text-[13px] font-medium text-[#0f1b33] placeholder:text-[#6b7586] focus:outline-none focus:border-[#1e3a8a] focus:ring-[3px] focus:ring-[#c9d4f0] transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-[#5b6577] hover:text-[#0f1b33]" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {([
              { key: 'all',      label: 'Tất cả',       count: totalWorkers },
              { key: 'problem',  label: 'Có vấn đề',    count: missingCount + warningCount },
              { key: 'complete', label: 'Đầy đủ',       count: completeCount },
            ] as const).map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-bold border transition-all ${
                    active
                      ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                      : 'bg-white text-[#334155] border-[#e3e8ef] hover:bg-[#f7f9fc]'
                  }`}
                >
                  {f.label}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-[#f3f5f9] text-[#5b6577]'}`}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Worker Cards List ── */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-20 bg-white rounded-[12px] border border-[#e3e8ef]">
              <Loader2 className="w-8 h-8 text-[#1e3a8a] animate-spin" />
              <p className="text-sm text-[#5b6577] font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center bg-white rounded-[12px] border border-[#e3e8ef]">
              <div className="w-14 h-14 rounded-[12px] bg-[#eef2fb] flex items-center justify-center">
                <FileText className="w-7 h-7 text-[#1e3a8a]" />
              </div>
              <div>
                <p className="font-bold text-[#0f1b33]">Không tìm thấy hồ sơ phù hợp</p>
                <p className="text-xs text-[#5b6577] mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái</p>
              </div>
            </div>
          ) : (
            <>
              {filteredWorkers.slice(0, visibleLimit).map((w) => {
              const summary = getWorkerSummary(w.id);
              const pct = Math.round((summary.validCount / summary.total) * 100);
              const isExpanded = expandedId === w.id;
              const borderColor = summary.hasError ? '#e31c23' : summary.hasWarning ? '#d97706' : '#10b981';

              return (
                <div
                  key={w.id}
                  className="bg-white rounded-[12px] shadow-[0_1px_2px_rgba(15,27,51,0.04)] border border-[#e3e8ef] overflow-hidden"
                  style={{ borderLeft: `4px solid ${borderColor}` }}
                >
                  <button
                    className="w-full text-left p-4 hover:bg-[#f7f9fc] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : w.id)}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-[10px] overflow-hidden bg-[#eef2fb] border border-[#c9d4f0] flex items-center justify-center">
                          {w.portrait_url
                            ? <img src={w.portrait_url} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={w.full_name} />
                            : <span className="text-[#1e3a8a] text-base font-extrabold">{w.full_name?.charAt(0)}</span>}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${summary.hasError ? 'bg-[#e31c23]' : summary.hasWarning ? 'bg-[#d97706]' : 'bg-[#10b981]'}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-[#0f1b33] text-sm truncate">{w.full_name}</p>
                        <p className="text-xs text-[#5b6577] mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono bg-[#f3f5f9] border border-[#e3e8ef] px-1.5 py-0.5 rounded text-[11px] font-bold text-[#334155]">{w.mnv}</span>
                          <span>·</span>
                          <span className="truncate">{w.team}</span>
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#f3f5f9] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: pct === 100 ? '#10b981' : pct >= 60 ? '#d97706' : '#e31c23',
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-[#5b6577] shrink-0">{summary.validCount}/{summary.total}</span>
                        </div>
                      </div>

                      {/* Doc status dots */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <div className="flex gap-1">
                          {summary.statuses.slice(0, 3).map((s) => (
                            <div
                              key={s.key}
                              className={`w-2.5 h-2.5 rounded-full ${STATUS_STYLE[s.status].dot}`}
                              title={s.label}
                            />
                          ))}
                        </div>
                        <div className="flex gap-1">
                          {summary.statuses.slice(3).map((s) => (
                            <div
                              key={s.key}
                              className={`w-2.5 h-2.5 rounded-full ${STATUS_STYLE[s.status].dot}`}
                              title={s.label}
                            />
                          ))}
                        </div>
                      </div>

                      <ChevronRight className={`h-4 w-4 text-[#5b6577] shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-[#e3e8ef] bg-[#f7f9fc]">
                      <div className="pt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {summary.statuses.map((s) => {
                          const style = STATUS_STYLE[s.status];
                          const statusLabel = { valid: 'Hợp lệ', expiring: 'Sắp hết', expired: 'Hết hạn', missing: 'Chưa có' }[s.status];
                          return (
                            <div key={s.key} className={`flex flex-col items-center gap-1.5 rounded-[10px] p-2.5 border ${style.bg} ${style.border}`}>
                              <div className={`${style.text}`}>{s.icon}</div>
                              <span className="text-[11px] font-bold text-[#0f1b33] text-center leading-tight">{s.label}</span>
                              <span className={`text-[11px] font-bold ${style.text} text-center leading-tight`}>{statusLabel}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex items-center gap-3 bg-white rounded-[10px] p-3 border border-[#e3e8ef]">
                        <CircularProgress pct={pct} />
                        <div>
                          <p className="text-sm font-extrabold text-[#0f1b33]">
                            {pct === 100 ? 'Hồ sơ đầy đủ' : summary.hasError ? 'Cần bổ sung hồ sơ' : 'Sắp hết hạn'}
                          </p>
                          <p className="text-xs text-[#5b6577] mt-0.5">
                            {summary.validCount}/{summary.total} giấy tờ hợp lệ
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
              {filteredWorkers.length > visibleLimit && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleLimit((prev) => prev + 60)}
                    className="btn-secondary"
                  >
                    Hiển thị thêm ({filteredWorkers.length - visibleLimit} hồ sơ còn lại)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Legend ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#e3e8ef] px-4 py-2.5 flex items-center justify-center gap-4 text-[11px] font-bold text-[#5b6577] z-30">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Hợp lệ</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#d97706]" /> Sắp hết hạn</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#e31c23]" /> Hết hạn</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#8592a4]" /> Chưa nộp</div>
      </div>
    </div>
  );
}
