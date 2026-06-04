'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Download, CheckCircle2, AlertTriangle, XCircle, Loader2,
  Search, SlidersHorizontal, ChevronRight, FileText, Shield,
  Heart, CreditCard, ClipboardCheck, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
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

const STATUS_STYLE: Record<DocStatus, { bg: string; text: string; dot: string }> = {
  valid:    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  expiring: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  expired:  { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
  missing:  { bg: 'bg-gray-100',    text: 'text-gray-500',    dot: 'bg-gray-400'    },
};

function CircularProgress({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct === 100 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="56" height="56" className="shrink-0 -rotate-90">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
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
  const [workers, setWorkers] = useState<any[]>([]);
  const [docsData, setDocsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'problem' | 'complete'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { fetchData(); setMounted(true); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: wData, error: wError } = await supabase.from('workers').select('*').order('created_at', { ascending: false });
    const { data: dData } = await supabase.from('documents').select('*');
    if (wError) toast.error('Lỗi khi tải dữ liệu');
    else setWorkers(wData || []);
    if (dData) setDocsData(dData);
    setLoading(false);
  };

  const getDocStatus = (workerId: string, type: string): DocStatus => {
    const doc = docsData.find((d) => d.worker_id === workerId && d.doc_type === type);
    if (!doc) return 'missing';
    if (type === 'health_certificate') {
      const issueDate = doc.issue_date || doc.created_at;
      const expiry = new Date(issueDate);
      expiry.setMonth(expiry.getMonth() + 6);
      const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 3600 * 24));
      if (diffDays <= 0) return 'expired';
      if (diffDays <= 30) return 'expiring';
      return 'valid';
    }
    if (doc.expiry_date) {
      const diffDays = Math.ceil((new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24));
      if (diffDays <= 0) return 'expired';
      if (diffDays <= 30) return 'expiring';
    }
    return 'valid';
  };

  const getWorkerSummary = (workerId: string) => {
    let validCount = 0, hasWarning = false, hasError = false;
    const statuses = DOC_CONFIG.map((d) => {
      const status = getDocStatus(workerId, d.key);
      if (status === 'valid') validCount++;
      if (status === 'expiring') { hasWarning = true; validCount++; }
      if (status === 'missing' || status === 'expired') hasError = true;
      return { ...d, status };
    });
    return { validCount, total: DOC_CONFIG.length, hasWarning, hasError, statuses };
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
    <div className="min-h-screen bg-slate-50">

      {/* ══════════════════════════════════════
          HERO HEADER — gradient + big stats
      ══════════════════════════════════════ */}
      <div
        className="relative overflow-hidden px-5 pt-6 pb-8"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #7c3aed 100%)' }}
      >
        {/* decorative blobs */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />

        <div className="relative z-10">
          {/* title row */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-1">Quản Lý</p>
              <h1 className="text-2xl font-bold text-white">Tình Trạng Hồ Sơ</h1>
              <p className="text-white/50 text-xs mt-1">{totalWorkers} công nhân trong hệ thống</p>
            </div>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-white/20 transition-all active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              Xuất Excel
            </button>
          </div>

          {/* big circular gauge + stats */}
          <div className="flex items-center gap-5 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4">
            {/* circular progress */}
            <div className="relative">
              <svg width="80" height="80" className="-rotate-90">
                <circle cx="40" cy="40" r="33" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="33" fill="none"
                  stroke={overallPct === 100 ? '#34d399' : overallPct >= 60 ? '#fbbf24' : '#f87171'}
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 33}
                  strokeDashoffset={mounted ? 2 * Math.PI * 33 * (1 - overallPct / 100) : 2 * Math.PI * 33}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{overallPct}%</span>
                <span className="text-white/50 text-[9px]">đầy đủ</span>
              </div>
            </div>

            {/* stat pills */}
            <div className="flex-1 grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-none">{completeCount}</p>
                  <p className="text-white/50 text-[10px] mt-0.5">Đầy đủ hồ sơ</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-none">{warningCount}</p>
                  <p className="text-white/50 text-[10px] mt-0.5">Sắp hết hạn</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-none">{missingCount}</p>
                  <p className="text-white/50 text-[10px] mt-0.5">Thiếu / Hết hạn</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          SEARCH + FILTER TABS
      ══════════════════════════════════════ */}
      <div className="px-4 -mt-1 pt-5 space-y-3 sticky top-0 bg-slate-50 z-20 pb-3 border-b border-slate-200/60">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm tên hoặc mã NV..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 shadow-sm transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {([
            { key: 'all',      label: 'Tất cả',       count: totalWorkers,  color: 'blue'   },
            { key: 'problem',  label: 'Có vấn đề',    count: missingCount + warningCount, color: 'red' },
            { key: 'complete', label: 'Đầy đủ',       count: completeCount, color: 'green'  },
          ] as const).map((f) => {
            const active = filter === f.key;
            const colors = {
              blue:  active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200',
              red:   active ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200',
              green: active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200',
            };
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm ${colors[f.color]}`}
              >
                {f.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════
          WORKER CARDS LIST
      ══════════════════════════════════════ */}
      <div className="px-4 py-4 space-y-3 pb-24">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
            <p className="text-sm text-gray-400">Đang tải dữ liệu...</p>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="font-semibold text-gray-500">Không tìm thấy</p>
              <p className="text-xs text-gray-400 mt-1">Thử thay đổi từ khóa hoặc bộ lọc</p>
            </div>
          </div>
        ) : (
          filteredWorkers.map((w, idx) => {
            const summary = getWorkerSummary(w.id);
            const pct = Math.round((summary.validCount / summary.total) * 100);
            const isExpanded = expandedId === w.id;
            const borderColor = summary.hasError ? '#ef4444' : summary.hasWarning ? '#f59e0b' : '#10b981';

            return (
              <div
                key={w.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                style={{
                  borderLeft: `3px solid ${borderColor}`,
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                {/* Card header — always visible */}
                <button
                  className="w-full text-left p-4"
                  onClick={() => setExpandedId(isExpanded ? null : w.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-800 to-red-700 flex items-center justify-center border-2 border-white shadow-sm">
                        {w.portrait_url
                          ? <img src={w.portrait_url} className="w-full h-full object-cover" alt={w.full_name} />
                          : <span className="text-white text-base font-bold">{w.full_name?.charAt(0)}</span>}
                      </div>
                      {/* Status dot */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${summary.hasError ? 'bg-red-500' : summary.hasWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{w.full_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{w.mnv}</span>
                        {' '}<span className="text-gray-300">·</span>{' '}{w.team}
                      </p>
                      {/* Mini progress bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: pct === 100 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 shrink-0">{summary.validCount}/{summary.total}</span>
                      </div>
                    </div>

                    {/* Doc status dots — compact */}
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

                    <ChevronRight className={`h-4 w-4 text-gray-300 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-50">
                    <div className="pt-3 grid grid-cols-5 gap-2">
                      {summary.statuses.map((s) => {
                        const style = STATUS_STYLE[s.status];
                        const statusLabel = { valid: 'Hợp lệ', expiring: 'Sắp hết', expired: 'Hết hạn', missing: 'Chưa có' }[s.status];
                        return (
                          <div key={s.key} className={`flex flex-col items-center gap-1.5 rounded-xl p-2 ${style.bg}`}>
                            <div className={`${style.text}`}>{s.icon}</div>
                            <span className="text-[9px] font-bold text-gray-600 text-center leading-tight">{s.short}</span>
                            <span className={`text-[8px] font-semibold ${style.text} text-center leading-tight`}>{statusLabel}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress ring inline */}
                    <div className="mt-3 flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <CircularProgress pct={pct} />
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {pct === 100 ? '✅ Hồ sơ đầy đủ' : summary.hasError ? '❌ Cần bổ sung hồ sơ' : '⚠️ Sắp hết hạn'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {summary.validCount}/{summary.total} giấy tờ hợp lệ
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ══════════════════════════════════════
          BOTTOM LEGEND (fixed)
      ══════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-4 py-2.5 flex items-center justify-center gap-4 text-[10px] text-gray-500 z-30">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Hợp lệ</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Sắp hết hạn</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Hết hạn</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-400" /> Chưa nộp</div>
      </div>
    </div>
  );
}
