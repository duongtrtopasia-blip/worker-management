'use client';

import React, { useState, useRef } from 'react';
import { Search, Car, User, MapPin, Phone, CreditCard, AlertCircle, CheckCircle2, Clock, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';

interface WorkerResult {
  id: string;
  mnv: string;
  full_name: string;
  cccd: string;
  team: string;
  area: string;
  position: string;
  phone: string;
  portrait_url: string;
  work_status: string;
  card_status: string;
  vehicle_plate: string;
  vehicle_type: string;
  start_date: string;
  created_at: string;
}

function WorkerPortrait({ worker }: { worker: WorkerResult }) {
  const [imgError, setImgError] = React.useState(false);

  if (worker.portrait_url && !imgError) {
    return (
      <img
        src={`/api/proxy-image?url=${encodeURIComponent(worker.portrait_url)}`}
        alt={worker.full_name}
        className="w-16 h-20 rounded-[10px] object-cover border border-[#e3e8ef]"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="w-16 h-20 rounded-[10px] flex items-center justify-center bg-[#eef2fb] border border-[#c9d4f0] text-[#1e3a8a] text-xl font-extrabold"
    >
      {worker.full_name?.charAt(0) || '?'}
    </div>
  );
}


export default function VehicleSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WorkerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setSearched(false);

    try {
      const res = await fetch(`/api/vehicle-search?plate=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Có lỗi xảy ra');
        setResults([]);
      } else {
        setResults(json.data);
      }
    } catch {
      setError('Không thể kết nối đến máy chủ');
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setError('');
    inputRef.current?.focus();
  };

  const cardStatusLabel = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      none:     { label: 'Chưa cấp thẻ',     cls: 'text-[#5b6577] bg-[#f3f5f9] border border-[#e3e8ef]' },
      pending:  { label: 'Chờ duyệt',         cls: 'text-[#92400e] bg-[#fef7e6] border border-[#f5d89a]' },
      approved: { label: 'Đã duyệt – Chờ in', cls: 'text-[#047857] bg-[#ecfdf5] border border-[#a7f3d0]' },
      issued:   { label: 'Đã cấp thẻ',        cls: 'text-[#1e3a8a] bg-[#eef2fb] border border-[#c9d4f0] font-bold' },
    };
    const s = map[status] || map.none;
    return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div className="min-h-screen p-5 sm:p-8 bg-[#f3f5f9]">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ===== HEADER ===== */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[10px] bg-[#1e3a8a]">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-[#0f1b33] tracking-[-0.02em]">Tra cứu biển số xe</h1>
            <p className="text-[13px] text-[#5b6577] mt-0.5">Tìm kiếm thông tin công nhân sở hữu phương tiện trong công trường</p>
          </div>
        </div>

        {/* ===== SEARCH BOX ===== */}
        <div className="bg-white rounded-[12px] border border-[#e3e8ef] shadow-[0_1px_2px_rgba(15,27,51,0.04)] overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="flex items-center gap-3">
                {/* License plate decoration */}
                <div
                  className="shrink-0 w-14 h-11 rounded-[10px] flex items-center justify-center bg-[#16296a] text-white text-xs font-extrabold tracking-widest border border-[#2a3f86]"
                >
                  VN
                </div>
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Nhập biển số xe, VD: 59X1-123.45"
                    className="w-full h-11 pl-4 pr-10 text-base font-bold tracking-widest rounded-[10px] border border-[#8592a4] text-[#0f1b33] focus:border-[#1e3a8a] focus:outline-none focus:ring-[3px] focus:ring-[#c9d4f0] transition-all uppercase placeholder:font-normal placeholder:text-sm placeholder:tracking-normal placeholder:text-[#6b7586]"
                    style={{ fontFamily: 'monospace' }}
                    autoFocus
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#5b6577] hover:text-[#0f1b33] hover:bg-[#f3f5f9] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="btn-primary h-11 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{loading ? 'Đang tìm...' : 'Tra cứu'}</span>
                </button>
              </div>
              <p className="text-xs text-[#5b6577]">
                Có thể nhập một phần biển số, VD: &quot;51G&quot;, &quot;29B&quot;, &quot;096&quot;
              </p>
            </form>
          </div>
        </div>

        {/* ===== ERROR ===== */}
        {error && (
          <div className="flex items-center gap-3 bg-[#fef2f2] border border-[#f5b5b8] rounded-[12px] p-4 text-[#b4141a]">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* ===== RESULTS ===== */}
        {searched && !loading && !error && (
          <div className="space-y-3">
            <div className="text-sm text-[#5b6577] flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>
                Tìm kiếm &ldquo;<strong className="text-[#0f1b33]">{query}</strong>&rdquo; —{' '}
                {results.length > 0
                  ? <><strong className="text-[#1e3a8a]">{results.length}</strong> kết quả</>
                  : <strong className="text-[#b4141a]">Không tìm thấy</strong>
                }
              </span>
            </div>

            {results.length === 0 ? (
              <div className="bg-white rounded-[12px] border border-[#e3e8ef] shadow-[0_1px_2px_rgba(15,27,51,0.04)] p-12 flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-[12px] bg-[#eef2fb] flex items-center justify-center">
                  <Car className="w-8 h-8 text-[#1e3a8a]" />
                </div>
                <p className="font-extrabold text-[#0f1b33]">Không tìm thấy xe nào</p>
                <p className="text-sm text-[#5b6577] max-w-xs">
                  Biển số &ldquo;{query}&rdquo; chưa được đăng ký trong hệ thống.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((w) => (
                  <div
                    key={w.id}
                    className="bg-white rounded-[12px] border border-[#e3e8ef] shadow-[0_1px_2px_rgba(15,27,51,0.04)] overflow-hidden hover:border-[#c9d4f0] transition-colors"
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">

                        {/* Portrait */}
                        <div className="shrink-0">
                          <WorkerPortrait worker={w} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="text-base font-extrabold text-[#0f1b33]">{w.full_name}</h3>
                              <p className="text-xs text-[#5b6577] mt-0.5 font-mono">MNV: {w.mnv} &middot; CCCD: {w.cccd}</p>
                            </div>
                            <Link href={`/workers/${w.id}`}>
                              <button className="shrink-0 flex items-center gap-1 text-xs text-[#1e3a8a] hover:underline font-bold whitespace-nowrap">
                                Xem hồ sơ <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          </div>

                          {/* Worker meta */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mb-3">
                            {w.team && (
                              <div className="flex items-center gap-1.5 text-xs text-[#334155]">
                                <User className="w-3.5 h-3.5 text-[#5b6577] shrink-0" />
                                <span className="truncate">{w.team}</span>
                              </div>
                            )}
                            {w.area && (
                              <div className="flex items-center gap-1.5 text-xs text-[#334155]">
                                <MapPin className="w-3.5 h-3.5 text-[#5b6577] shrink-0" />
                                <span className="truncate">{w.area}</span>
                              </div>
                            )}
                            {w.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-[#334155]">
                                <Phone className="w-3.5 h-3.5 text-[#5b6577] shrink-0" />
                                <span>{w.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Vehicle + card status */}
                          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-[#e3e8ef]">
                            <div
                              className="flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[#1e3a8a] text-white text-xs font-bold tracking-widest font-mono"
                            >
                              <Car className="w-3.5 h-3.5" />
                              {w.vehicle_plate}
                            </div>
                            {w.vehicle_type && (
                              <span className="text-xs text-[#334155] bg-[#f3f5f9] border border-[#e3e8ef] px-2.5 py-1 rounded-[8px] font-bold">
                                {w.vehicle_type}
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-[#5b6577]">
                              <CreditCard className="w-3.5 h-3.5" />
                              {cardStatusLabel(w.card_status || 'none')}
                            </div>
                            <div className="ml-auto flex items-center gap-1 text-xs">
                              {w.work_status === 'active' || !w.work_status ? (
                                <><CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /><span className="text-[#047857] font-bold">Đang làm việc</span></>
                              ) : (
                                <><AlertCircle className="w-3.5 h-3.5 text-[#e31c23]" /><span className="text-[#b4141a] font-bold">Nghỉ việc</span></>
                              )}
                            </div>
                          </div>

                          {w.start_date && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-[#5b6577]">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>Ngày vào làm: <strong className="text-[#0f1b33]">{new Date(w.start_date).toLocaleDateString('vi-VN')}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== INITIAL STATE ===== */}
        {!searched && !loading && (
          <div className="bg-white rounded-[12px] border border-[#e3e8ef] shadow-[0_1px_2px_rgba(15,27,51,0.04)] p-10 flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-[16px] flex items-center justify-center bg-[#eef2fb] border border-[#c9d4f0]">
              <Car className="w-10 h-10 text-[#1e3a8a]" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#0f1b33] text-base">Tra cứu theo biển số xe</h3>
              <p className="text-sm text-[#5b6577] mt-1 max-w-sm">
                Nhập biển số xe vào ô tìm kiếm phía trên để xem thông tin công nhân sở hữu phương tiện đó.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {['51G-123.45', '29B-456.78', '28A-789.01'].map(plate => (
                <button
                  key={plate}
                  onClick={() => setQuery(plate)}
                  className="px-3 py-1.5 rounded-[8px] border border-[#e3e8ef] bg-[#f7f9fc] text-xs font-bold text-[#334155] hover:border-[#1e3a8a] hover:text-[#1e3a8a] transition-colors font-mono"
                >
                  {plate}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
