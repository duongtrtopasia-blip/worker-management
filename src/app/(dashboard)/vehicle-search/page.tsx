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
        className="w-16 h-20 rounded-xl object-cover border border-gray-100"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="w-16 h-20 rounded-xl flex items-center justify-center text-white text-xl font-bold"
      style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b5fc0)' }}
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
      none:     { label: 'Chưa cấp thẻ',     cls: 'text-gray-500 bg-gray-100' },
      pending:  { label: 'Chờ duyệt',         cls: 'text-amber-700 bg-amber-100' },
      approved: { label: 'Đã duyệt – Chờ in', cls: 'text-green-700 bg-green-100' },
      issued:   { label: 'Đã cấp thẻ',        cls: 'text-blue-700 bg-blue-100 font-semibold' },
    };
    const s = map[status] || map.none;
    return <span className={`text-xs px-2 py-1 rounded-md ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div className="min-h-screen p-5 sm:p-8" style={{ backgroundColor: '#f0f4f8' }}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ===== HEADER ===== */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tra Cứu Biển Số Xe</h1>
            <p className="text-sm text-gray-400 mt-0.5">Tìm kiếm thông tin công nhân theo biển số xe</p>
          </div>
        </div>

        {/* ===== SEARCH BOX ===== */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex items-center gap-3">
                {/* License plate decoration */}
                <div
                  className="shrink-0 w-14 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold tracking-widest shadow-md"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b5fc0)' }}
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
                    className="w-full h-12 pl-4 pr-10 text-lg font-bold tracking-widest rounded-xl border-2 border-gray-200 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all uppercase placeholder:font-normal placeholder:text-sm placeholder:tracking-normal placeholder:text-gray-400"
                    style={{ fontFamily: 'monospace' }}
                    autoFocus
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="h-12 px-6 rounded-xl font-semibold text-white text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{loading ? 'Đang tìm...' : 'Tra cứu'}</span>
                </button>
              </div>
              <p className="text-xs text-gray-400">
                💡 Có thể nhập một phần biển số, VD: &quot;51G&quot;, &quot;29B&quot;, &quot;096&quot;
              </p>
            </form>
          </div>
        </div>

        {/* ===== ERROR ===== */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4 text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* ===== RESULTS ===== */}
        {searched && !loading && !error && (
          <div className="space-y-3">
            {/* Count */}
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>
                Tìm kiếm &ldquo;<strong className="text-gray-800">{query}</strong>&rdquo; —{' '}
                {results.length > 0
                  ? <><strong className="text-brand-blue">{results.length}</strong> kết quả</>
                  : <strong className="text-red-500">Không tìm thấy</strong>
                }
              </span>
            </div>

            {results.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                  <Car className="w-8 h-8 text-gray-200" />
                </div>
                <p className="font-semibold text-gray-700">Không tìm thấy xe nào</p>
                <p className="text-sm text-gray-400 max-w-xs">
                  Biển số &ldquo;{query}&rdquo; chưa được đăng ký trong hệ thống.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((w) => (
                  <div
                    key={w.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">

                        {/* Portrait */}
                        <div className="shrink-0">
                          <WorkerPortrait worker={w} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {/* Name + link */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="text-base font-bold text-gray-900">{w.full_name}</h3>
                              <p className="text-xs text-gray-400 mt-0.5">MNV: {w.mnv} &middot; CCCD: {w.cccd}</p>
                            </div>
                            <Link href={`/workers/${w.id}`}>
                              <button className="shrink-0 flex items-center gap-1 text-xs text-brand-blue hover:underline font-medium whitespace-nowrap">
                                Xem hồ sơ <ChevronRight className="w-3 h-3" />
                              </button>
                            </Link>
                          </div>

                          {/* Worker meta */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mb-3">
                            {w.team && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <User className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                <span className="truncate">{w.team}</span>
                              </div>
                            )}
                            {w.area && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                <span className="truncate">{w.area}</span>
                              </div>
                            )}
                            {w.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Phone className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                <span>{w.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Vehicle + card status */}
                          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-gray-50">
                            {/* Plate badge */}
                            <div
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold tracking-widest"
                              style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b5fc0)', fontFamily: 'monospace' }}
                            >
                              <Car className="w-3.5 h-3.5" />
                              {w.vehicle_plate}
                            </div>
                            {w.vehicle_type && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                {w.vehicle_type}
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <CreditCard className="w-3.5 h-3.5" />
                              {cardStatusLabel(w.card_status || 'none')}
                            </div>
                            <div className="ml-auto flex items-center gap-1 text-xs">
                              {w.work_status === 'active' || !w.work_status ? (
                                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600 font-medium">Đang làm việc</span></>
                              ) : (
                                <><AlertCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-red-500 font-medium">Nghỉ việc</span></>
                              )}
                            </div>
                          </div>

                          {/* Start date */}
                          {w.start_date && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>Ngày vào làm: <strong className="text-gray-600">{new Date(w.start_date).toLocaleDateString('vi-VN')}</strong></span>
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.08), rgba(151,7,49,0.08))' }}
            >
              <Car className="w-10 h-10" style={{ color: '#1e3a8a' }} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 text-base">Tra cứu theo biển số xe</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-sm">
                Nhập biển số xe vào ô tìm kiếm phía trên để xem thông tin công nhân sở hữu phương tiện đó.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {['51G-123.45', '29B-456.78', '28A-789.01'].map(plate => (
                <button
                  key={plate}
                  onClick={() => setQuery(plate)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors font-mono"
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
