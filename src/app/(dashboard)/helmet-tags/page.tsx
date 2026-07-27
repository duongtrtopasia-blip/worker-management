'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, Printer, Users, Filter, Download, Trash2,
  CheckSquare, Square, Search, HardHat, FileSpreadsheet,
  ChevronDown, X, Eye, AlertCircle, CheckCircle2,
  Database, RefreshCw, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getTeamsAction, getWorkersByTeamAction } from '@/app/actions/worker';

/* ─────────────────────────────────────────────────
   Types
───────────────────────────────────────────────── */
interface Worker {
  id: string;
  mnv: string;
  ho_ten: string;
  chuc_danh: string;
  to_doi: string;
  selected: boolean;
}

const TAGS_PER_PAGE = 16; // A4 ngang: 4 cột × 4 hàng

/* ─────────────────────────────────────────────────
   Helmet Tag Component
───────────────────────────────────────────────── */
function HelmetTag({ worker, logoUrl }: { worker: Worker; logoUrl: string | null }) {
  return (
    <div style={{
      width: '60mm', height: '35mm', border: '1.5px solid #1e3a8a', borderRadius: '4px',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ffffff',
      boxSizing: 'border-box', pageBreakInside: 'avoid', fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{
        background: 'linear-gradient(90deg, #1e3a8a 0%, #970731 100%)', height: '8mm',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0,
      }}>
        {logoUrl
          ? <img src={logoUrl} alt="Logo" style={{ height: '6mm', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          : <span style={{ color: '#fdef03', fontSize: '7pt', fontWeight: 'bold' }}>CÔNG TY</span>}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5mm 3mm', gap: '0.8mm' }}>
        <div style={{ fontSize: '9pt', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'center', lineHeight: 1.2, textTransform: 'uppercase' }}>
          {worker.ho_ten}
        </div>
        {worker.mnv && (
          <div style={{ fontSize: '6pt', color: '#6b7280', textAlign: 'center', letterSpacing: '0.05em' }}>
            MNV: <span style={{ fontWeight: '600', color: '#374151' }}>{worker.mnv}</span>
          </div>
        )}
        <div style={{ height: '0.5px', background: 'linear-gradient(90deg, transparent, #1e3a8a44, transparent)', margin: '0.3mm 4mm' }} />
        <div style={{ display: 'flex', gap: '2mm', justifyContent: 'center' }}>
          <div style={{ background: '#f0f4ff', border: '0.5px solid #1e3a8a33', borderRadius: '2px', padding: '0.5mm 2mm', fontSize: '7pt', textAlign: 'center', flex: 1, maxWidth: '50%' }}>
            <div style={{ color: '#6b7280', fontSize: '5.5pt', marginBottom: '0.3mm' }}>CHỨC DANH</div>
            <div style={{ fontWeight: '600', color: '#1f2937', lineHeight: 1.1 }}>{worker.chuc_danh || '—'}</div>
          </div>
          <div style={{ background: '#fff5f5', border: '0.5px solid #97073133', borderRadius: '2px', padding: '0.5mm 2mm', fontSize: '7pt', textAlign: 'center', flex: 1, maxWidth: '50%' }}>
            <div style={{ color: '#6b7280', fontSize: '5.5pt', marginBottom: '0.3mm' }}>TỔ ĐỘI</div>
            <div style={{ fontWeight: '600', color: '#970731', lineHeight: 1.1 }}>{worker.to_doi || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   FilterSelect (dùng cho bảng công nhân)
───────────────────────────────────────────────── */
function FilterSelect({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: string[]; label: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const isActive = value !== '';

  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = ['Tất cả', ...options].filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`h-9 pl-3 pr-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 border transition-all duration-200 whitespace-nowrap min-w-[140px] ${isActive ? 'text-white border-transparent shadow-md' : 'text-gray-600 bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
        style={isActive ? { background: 'linear-gradient(135deg, #1e3a8a, #970731)' } : {}}>
        <Filter className={`w-3.5 h-3.5 ${isActive ? 'text-white/80' : 'text-gray-400'}`} />
        <span className="flex-1 text-left">{value || label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''} ${isActive ? 'text-white/70' : 'text-gray-400'}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tổ đội..."
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400" autoFocus />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(opt => (
              <button key={opt} type="button"
                onClick={() => { onChange(opt === 'Tất cả' ? '' : opt); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${(opt === 'Tất cả' ? '' : opt) === value ? 'text-blue-700 font-semibold bg-blue-50' : 'text-gray-700'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   DB Team Selector Panel
───────────────────────────────────────────────── */
function DBTeamSelector({ onLoad }: { onLoad: (workers: Worker[]) => void }) {
  const [teams, setTeams] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  // Tìm kiếm lọc danh sách đã tải
  const [teamSearch, setTeamSearch] = useState('');
  // Tìm kiếm trực tiếp DB
  const [directSearch, setDirectSearch] = useState('');
  const [directSearching, setDirectSearching] = useState(false);

  const fetchTeams = async () => {
    setLoadingTeams(true);
    setError('');
    try {
      const res = await getTeamsAction();
      if (res.error) setError(res.error);
      else { setTeams(res.teams); setLoaded(true); }
    } catch (e: any) {
      setError(e.message || 'Không kết nối được database');
    } finally {
      setLoadingTeams(false);
    }
  };

  const toggleTeam = (team: string) => {
    setSelectedTeams(prev => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team); else next.add(team);
      return next;
    });
  };

  const filteredTeams = teams.filter(t => t.toLowerCase().includes(teamSearch.toLowerCase()));

  const toggleAllFiltered = () => {
    const allSelected = filteredTeams.every(t => selectedTeams.has(t));
    setSelectedTeams(prev => {
      const next = new Set(prev);
      if (allSelected) filteredTeams.forEach(t => next.delete(t));
      else filteredTeams.forEach(t => next.add(t));
      return next;
    });
  };

  // Lấy công nhân theo tổ đã chọn từ danh sách
  const handleLoadWorkers = async () => {
    setLoadingWorkers(true);
    setError('');
    try {
      const teamsToLoad = selectedTeams.size > 0 ? [...selectedTeams] : undefined;
      let allWorkers: Worker[] = [];

      if (!teamsToLoad) {
        const res = await getWorkersByTeamAction();
        if (res.error) { setError(res.error); return; }
        allWorkers = res.workers.map(w => ({ id: w.id, mnv: w.mnv || '', ho_ten: w.full_name, chuc_danh: w.position || '', to_doi: w.team || '', selected: true }));
      } else {
        for (const team of teamsToLoad) {
          const res = await getWorkersByTeamAction(team);
          if (res.error) continue;
          allWorkers.push(...res.workers.map(w => ({ id: w.id, mnv: w.mnv || '', ho_ten: w.full_name, chuc_danh: w.position || '', to_doi: w.team || '', selected: true })));
        }
      }

      const unique = [...new Map(allWorkers.map(w => [w.id, w])).values()];
      onLoad(unique);
    } catch (e: any) {
      setError(e.message || 'Lỗi khi tải dữ liệu');
    } finally {
      setLoadingWorkers(false);
    }
  };

  // Tìm kiếm trực tiếp DB theo từ khóa (ilike)
  const handleDirectSearch = async () => {
    if (!directSearch.trim()) return;
    setDirectSearching(true);
    setError('');
    try {
      const res = await getWorkersByTeamAction(undefined, directSearch.trim());
      if (res.error) { setError(res.error); return; }
      const workers: Worker[] = res.workers.map(w => ({
        id: w.id, mnv: w.mnv || '', ho_ten: w.full_name, chuc_danh: w.position || '', to_doi: w.team || '', selected: true,
      }));
      if (workers.length === 0) {
        setError(`Không tìm thấy công nhân nào trong tổ có tên chứa "${directSearch}"`);
      } else {
        onLoad(workers);
      }
    } catch (e: any) {
      setError(e.message || 'Lỗi tìm kiếm');
    } finally {
      setDirectSearching(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white border-2 border-blue-100 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #eff6ff, #fdf2f8)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Lấy từ Database</h3>
          <p className="text-xs text-gray-500">Chọn tổ đội cần in từ dữ liệu hệ thống</p>
        </div>
        <div className="ml-auto">
          {!loaded ? (
            <button onClick={fetchTeams} disabled={loadingTeams}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow hover:shadow-md hover:scale-[1.02] transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
              {loadingTeams ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {loadingTeams ? 'Đang tải...' : 'Tải danh sách tổ đội'}
            </button>
          ) : (
            <button onClick={fetchTeams} disabled={loadingTeams}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all disabled:opacity-60">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTeams ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          )}
        </div>
      </div>

      {/* ── Tìm kiếm trực tiếp DB ── */}
      <div className="px-6 pt-5 pb-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" />
          Tìm kiếm tổ đội và lấy ngay
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={directSearch}
              onChange={e => setDirectSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleDirectSearch(); }}
              placeholder="Nhập tên tổ đội... (VD: Tổ 1, TH-02, Điện)"
              className="w-full pl-9 pr-8 h-11 text-sm rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none transition-all font-medium"
            />
            {directSearch && (
              <button onClick={() => setDirectSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleDirectSearch}
            disabled={directSearching || !directSearch.trim()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl shadow hover:shadow-md hover:scale-[1.02] transition-all disabled:opacity-50 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}>
            {directSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {directSearching ? 'Đang tìm...' : 'Lấy danh sách'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 ml-1">
          Tìm gần đúng (không cần nhập đúng hoàn toàn) • Nhấn <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> để tìm
        </p>
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium bg-white px-2">hoặc chọn từ danh sách</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-6 mb-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Danh sách tổ với filter ── */}
      {loaded && teams.length > 0 && (
        <div className="px-6 pb-6 space-y-3">
          {/* Thanh lọc + chọn tất cả */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                placeholder={`Lọc trong ${teams.length} tổ đội...`}
                className="w-full pl-8 pr-8 h-8 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none transition-all"
              />
              {teamSearch && (
                <button onClick={() => setTeamSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={toggleAllFiltered}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap hover:underline">
              {filteredTeams.length > 0 && filteredTeams.every(t => selectedTeams.has(t)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
            {selectedTeams.size > 0 && (
              <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                {selectedTeams.size} đã chọn
              </span>
            )}
          </div>

          {/* Grid tổ đội */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
            {filteredTeams.length > 0 ? filteredTeams.map(team => {
              const isSelected = selectedTeams.has(team);
              return (
                <button key={team} onClick={() => toggleTeam(team)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 text-left ${
                    isSelected
                      ? 'border-transparent text-white shadow-md scale-[1.02]'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  style={isSelected ? { background: 'linear-gradient(135deg, #1e3a8a, #970731)' } : {}}>
                  {isSelected
                    ? <CheckSquare className="w-4 h-4 shrink-0 text-white/80" />
                    : <Square className="w-4 h-4 shrink-0 text-gray-400" />}
                  <span className="truncate">{team}</span>
                </button>
              );
            }) : (
              <div className="col-span-4 py-8 text-center">
                <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Không tìm thấy tổ nào chứa &ldquo;<b>{teamSearch}</b>&rdquo;</p>
                <p className="text-gray-300 text-xs mt-1">Thử dùng ô tìm kiếm trực tiếp DB ở trên</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {selectedTeams.size === 0
                ? <span>Không chọn tổ nào → lấy <b>tất cả</b> công nhân</span>
                : <span>Đã chọn <b className="text-blue-700">{selectedTeams.size}</b>/{teams.length} tổ đội</span>}
            </p>
            <button onClick={handleLoadWorkers} disabled={loadingWorkers}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}>
              {loadingWorkers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              {loadingWorkers ? 'Đang tải...' : 'Lấy danh sách công nhân'}
            </button>
          </div>
        </div>
      )}

      {loaded && teams.length === 0 && (
        <div className="py-10 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Không có dữ liệu tổ đội trong hệ thống</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────── */
export default function HelmetTagsPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filterTo, setFilterTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>('/logo.svg');
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceTab, setSourceTab] = useState<'db' | 'excel'>('db');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const allTeams = React.useMemo(() =>
    [...new Set(workers.map(w => w.to_doi).filter(Boolean))].sort()
  , [workers]);

  const filteredWorkers = React.useMemo(() =>
    workers.filter(w => {
      const matchTeam = !filterTo || w.to_doi === filterTo;
      const matchSearch = !searchText || w.ho_ten.toLowerCase().includes(searchText.toLowerCase());
      return matchTeam && matchSearch;
    })
  , [workers, filterTo, searchText]);

  const selectedWorkers = filteredWorkers.filter(w => w.selected);
  const allSelected = filteredWorkers.length > 0 && filteredWorkers.every(w => w.selected);

  const toggleSelect = (id: string) => setWorkers(prev => prev.map(w => w.id === id ? { ...w, selected: !w.selected } : w));
  const toggleAll = () => {
    const ids = new Set(filteredWorkers.map(w => w.id));
    setWorkers(prev => prev.map(w => ids.has(w.id) ? { ...w, selected: !allSelected } : w));
  };

  const handleDBLoad = (newWorkers: Worker[]) => {
    if (newWorkers.length === 0) { showToast('Không có công nhân nào trong tổ đã chọn!', 'error'); return; }
    setWorkers(newWorkers);
    setFilterTo(''); setSearchText('');
    showToast(`✅ Đã tải ${newWorkers.length} công nhân từ hệ thống!`);
  };

  const parseExcel = useCallback((file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (rows.length === 0) { showToast('File Excel không có dữ liệu!', 'error'); setIsLoading(false); return; }
        const colAliases: Record<string, string[]> = {
          mnv: ['mnv', 'mã nhân viên', 'ma nhan vien', 'employee_id', 'maNV', 'manv', 'mã nv'],
          ho_ten: ['ho_ten', 'họ tên', 'ho ten', 'hoten', 'fullname', 'name', 'ten', 'họ và tên'],
          chuc_danh: ['chuc_danh', 'chức danh', 'position', 'chức vụ', 'title', 'job_title'],
          to_doi: ['to_doi', 'tổ đội', 'to doi', 'team', 'group', 'tổ', 'đội', 'to', 'doi'],
        };
        const findCol = (row: Record<string, string>, aliases: string[]) => {
          for (const key of Object.keys(row))
            if (aliases.some(a => key.toLowerCase().trim() === a.toLowerCase())) return row[key];
          return '';
        };
        const parsed: Worker[] = rows.map((row, i) => ({
          id: `excel-${i}-${Date.now()}`,
          mnv: String(findCol(row, colAliases.mnv) || '').trim(),
          ho_ten: String(findCol(row, colAliases.ho_ten) || row[Object.keys(row)[0]] || '').trim(),
          chuc_danh: String(findCol(row, colAliases.chuc_danh) || '').trim(),
          to_doi: String(findCol(row, colAliases.to_doi) || '').trim(),
          selected: true,
        })).filter(w => w.ho_ten);
        setWorkers(parsed);
        setFilterTo(''); setSearchText('');
        showToast(`✅ Đã import ${parsed.length} công nhân từ Excel!`);
      } catch { showToast('❌ Lỗi đọc file Excel. Vui lòng kiểm tra lại!', 'error'); }
      finally { setIsLoading(false); }
    };
    reader.readAsBinaryString(file);
  }, [showToast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) parseExcel(file);
    else showToast('Vui lòng chọn file Excel (.xlsx, .xls)', 'error');
  };

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const handlePrint = () => {
    const toPrint = selectedWorkers.length > 0 ? selectedWorkers : filteredWorkers;
    if (toPrint.length === 0) { showToast('Không có công nhân nào để in!', 'error'); return; }
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { showToast('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup!', 'error'); return; }
    const pages: Worker[][] = [];
    for (let i = 0; i < toPrint.length; i += TAGS_PER_PAGE) pages.push(toPrint.slice(i, i + TAGS_PER_PAGE));
    // Dùng URL tuyệt đối để logo hiển thị đúng trong cửa sổ in popup
    const absoluteLogo = logoUrl
      ? (logoUrl.startsWith('blob:') || logoUrl.startsWith('http') ? logoUrl : `${window.location.origin}${logoUrl}`)
      : null;
    const logoHtml = absoluteLogo
      ? `<img src="${absoluteLogo}" alt="Logo" style="height:6mm;width:auto;object-fit:contain;filter:brightness(0) invert(1);max-width:30mm;" />`
      : `<span style="color:#fdef03;font-size:7pt;font-weight:bold;">CÔNG TY</span>`;
    const tagHtml = (w: Worker) => `
      <div style="width:60mm;height:35mm;border:1.5px solid #1e3a8a;border-radius:4px;display:flex;flex-direction:column;overflow:hidden;background:#ffffff;box-sizing:border-box;break-inside:avoid;font-family:Arial,sans-serif;">
        <div style="background:linear-gradient(90deg,#1e3a8a 0%,#970731 100%);height:8mm;display:flex;align-items:center;justify-content:center;padding:0 4px;flex-shrink:0;">${logoHtml}</div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:1.5mm 3mm;gap:0.8mm;">
          <div style="font-size:9pt;font-weight:bold;color:#1e3a8a;text-align:center;line-height:1.2;text-transform:uppercase;">${escapeHtml(w.ho_ten)}</div>
          ${w.mnv ? `<div style="font-size:6pt;color:#6b7280;text-align:center;letter-spacing:0.05em;">MNV: <span style="font-weight:600;color:#374151;">${escapeHtml(w.mnv)}</span></div>` : ''}
          <div style="height:0.5px;background:linear-gradient(90deg,transparent,#1e3a8a44,transparent);margin:0.3mm 4mm;"></div>
          <div style="display:flex;gap:2mm;justify-content:center;">
            <div style="background:#f0f4ff;border:0.5px solid #1e3a8a33;border-radius:2px;padding:0.5mm 2mm;font-size:7pt;text-align:center;flex:1;max-width:50%;">
              <div style="color:#6b7280;font-size:5.5pt;margin-bottom:0.3mm;">CHỨC DANH</div>
              <div style="font-weight:600;color:#1f2937;line-height:1.1;">${escapeHtml(w.chuc_danh || '—')}</div>
            </div>
            <div style="background:#fff5f5;border:0.5px solid #97073133;border-radius:2px;padding:0.5mm 2mm;font-size:7pt;text-align:center;flex:1;max-width:50%;">
              <div style="color:#6b7280;font-size:5.5pt;margin-bottom:0.3mm;">TỔ ĐỘI</div>
              <div style="font-weight:600;color:#970731;line-height:1.1;">${escapeHtml(w.to_doi || '—')}</div>
            </div>
          </div>
        </div>
      </div>`;

    const pagesHtml = pages.map(page => `
      <div style="width:297mm;min-height:210mm;padding:8mm 10mm;box-sizing:border-box;break-after:page;display:grid;grid-template-columns:repeat(4,60mm);grid-template-rows:repeat(4,35mm);gap:5mm 6mm;align-content:start;justify-content:center;">
        ${page.map(w => tagHtml(w)).join('')}
      </div>`).join('');
    printWindow.document.write(`<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><title>In Tem Mũ Bảo Hộ (A4 Ngang) - ${new Date().toLocaleDateString('vi-VN')}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:white;font-family:Arial,sans-serif;}
@page{size:A4 landscape;margin:0;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style>
</head><body>${pagesHtml}
<script>window.onload=function(){setTimeout(function(){window.print();},600);};<\/script>
</body></html>`);
    printWindow.document.close();
  };

  const downloadSample = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['mnv', 'ho_ten', 'chuc_danh', 'to_doi'],
      ['NV001', 'Nguyễn Văn An', 'Thợ hồ', 'Tổ 1'],
      ['NV002', 'Trần Thị Bình', 'Thợ điện', 'Tổ 2'],
      ['NV003', 'Lê Văn Cường', 'Tổ trưởng', 'Tổ 1'],
    ]);
    ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 20 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, ws, 'DanhSach');
    XLSX.writeFile(wb, 'mau_danh_sach_tem_mu.xlsx');
  };

  const workersToPrint = selectedWorkers.length > 0 ? selectedWorkers : filteredWorkers;
  const pageCount = Math.ceil(workersToPrint.length / TAGS_PER_PAGE);

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-5" style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e8edf5 100%)' }}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">In Tem Mũ Bảo Hộ</h1>
            <p className="text-xs text-gray-500 mt-0.5">In theo tổ đội • A4 ngang • Tối đa 16 tem/trang</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={downloadSample} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <Download className="w-4 h-4" /> Tải mẫu Excel
          </button>
          {workers.length > 0 && (
            <>
              <button onClick={() => setShowPreview(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all">
                <Eye className="w-4 h-4" /> Xem trước ({pageCount} trang)
              </button>
              <button onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
                <Printer className="w-4 h-4" />
                In {workersToPrint.length} tem{selectedWorkers.length > 0 ? ' (đã chọn)' : ''}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {workers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tổng công nhân', value: workers.length, color: '#1e3a8a', icon: <Users className="w-4 h-4" /> },
            { label: 'Đang hiển thị', value: filteredWorkers.length, color: '#0891b2', icon: <Filter className="w-4 h-4" /> },
            { label: 'Đã chọn in', value: selectedWorkers.length, color: '#059669', icon: <CheckSquare className="w-4 h-4" /> },
            { label: 'Số tổ đội', value: allTeams.length, color: '#970731', icon: <HardHat className="w-4 h-4" /> },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: s.color }}>{s.icon}</div>
              <div>
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Source selection (only when no data) */}
      {workers.length === 0 && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
            <button onClick={() => setSourceTab('db')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${sourceTab === 'db' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <Database className="w-4 h-4" /> Từ hệ thống
            </button>
            <button onClick={() => setSourceTab('excel')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${sourceTab === 'excel' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <FileSpreadsheet className="w-4 h-4" /> Import Excel
            </button>
          </div>

          {sourceTab === 'db' && <DBTeamSelector onLoad={handleDBLoad} />}

          {sourceTab === 'excel' && (
            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 py-16 ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/30'}`}>
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                  <p className="text-blue-600 font-medium">Đang đọc file Excel...</p>
                </div>
              ) : (
                <>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}
                    style={{ background: isDragging ? 'linear-gradient(135deg, #1e3a8a, #970731)' : 'linear-gradient(135deg, #e0e7ff, #fce7f3)' }}>
                    <FileSpreadsheet className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-800">Kéo thả file Excel vào đây</p>
                    <p className="text-sm text-gray-500 mt-1">hoặc click để chọn file • Hỗ trợ .xlsx, .xls</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Cột cần có: <code className="bg-gray-100 px-1.5 py-0.5 rounded">ho_ten</code>{' '}
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">chuc_danh</code>{' '}
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">to_doi</code>
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex items-center gap-2 px-6 py-2.5 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
                    <Upload className="w-4 h-4" /> Chọn file Excel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Worker table */}
      {workers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Tìm tên công nhân..."
                className="w-full pl-8 pr-3 h-9 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all" />
            </div>
            <FilterSelect value={filterTo} onChange={setFilterTo} options={allTeams} label="Lọc theo tổ đội" />
            {(filterTo || searchText) && (
              <button onClick={() => { setFilterTo(''); setSearchText(''); }}
                className="h-9 px-3 rounded-xl text-sm text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 flex items-center gap-1.5 transition-all">
                <X className="w-3.5 h-3.5" /> Xóa lọc
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => { setWorkers([]); setFilterTo(''); setSearchText(''); }}
                className="h-9 px-3 rounded-xl text-sm text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center gap-1.5 transition-all">
                <RefreshCw className="w-3.5 h-3.5" /> Đổi nguồn
              </button>
              <button onClick={() => { setWorkers([]); setFilterTo(''); setSearchText(''); }}
                className="h-9 px-3 rounded-xl text-sm text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 flex items-center gap-1.5 transition-all">
                <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-10 px-4 py-3 text-left">
                    <button onClick={toggleAll}>
                      {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">STT</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">MNV</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Họ tên</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Chức danh</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổ đội</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview tem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredWorkers.map((worker, idx) => (
                  <tr key={worker.id} className={`transition-colors hover:bg-gray-50/80 ${worker.selected ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(worker.id)}>
                        {worker.selected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs font-mono">{worker.mnv || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-3 font-semibold text-gray-900">{worker.ho_ten}</td>
                    <td className="px-3 py-3 text-gray-600">{worker.chuc_danh || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-3">
                      {worker.to_doi
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>{worker.to_doi}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div style={{ transform: 'scale(0.52)', transformOrigin: 'left center', width: '115px', height: '35mm', display: 'inline-block' }}>
                        <HelmetTag worker={worker} logoUrl={logoUrl} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredWorkers.length === 0 && (
              <div className="py-16 text-center">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Không tìm thấy công nhân nào</p>
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
            <span>
              Hiển thị <b className="text-gray-700">{filteredWorkers.length}</b> / {workers.length} công nhân
              {selectedWorkers.length > 0 && <span className="ml-2 text-blue-600 font-semibold">• Đã chọn: {selectedWorkers.length}</span>}
            </span>
            <span>Sẽ in: <b className="text-blue-700">{workersToPrint.length}</b> tem ({pageCount} trang A4)</span>
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }} />
          Logo trên tem mũ
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {/* Preview logo */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700">
            {logoUrl
              ? <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)', maxWidth: '80px' }} />
              : <span className="text-gray-400 text-xs">Không có logo</span>}
            <div>
              <p className="text-white text-xs font-semibold">
                {logoUrl === '/logo.svg' || logoUrl === '/logo.png' ? 'VINCONS' : 'Logo tùy chỉnh'}
              </p>
              <p className="text-gray-400 text-[10px] mt-0.5">
                {logoUrl === '/logo.svg' ? 'Mặc định (SVG)' : logoUrl === '/logo.png' ? 'Mặc định (PNG)' : 'Đã đổi'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => logoInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all">
              <Upload className="w-3.5 h-3.5" /> Đổi logo khác
            </button>
            {logoUrl !== '/logo.svg' && (
              <button onClick={() => setLogoUrl('/logo.svg')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-3.5 h-3.5" /> Về logo Vincons
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">Logo tự động chuyển màu trắng trên nền tối của tem</p>
        </div>
      </div>

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) parseExcel(f); e.target.value = ''; }} />
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogoUrl(URL.createObjectURL(f)); e.target.value = ''; }} />

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center py-8 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Xem trước bố cục in</h2>
                <p className="text-xs text-gray-500 mt-0.5">{workersToPrint.length} tem • {pageCount} trang A4 ngang • Max 16 tem/trang</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl shadow-lg hover:scale-[1.02] transition-all"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
                  <Printer className="w-4 h-4" /> In ngay
                </button>
                <button onClick={() => setShowPreview(false)}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {Array.from({ length: pageCount }, (_, pi) => {
                const pageWorkers = workersToPrint.slice(pi * TAGS_PER_PAGE, (pi + 1) * TAGS_PER_PAGE);
                return (
                  <div key={pi}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trang {pi + 1}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-400">{pageWorkers.length} tem</span>
                    </div>
                    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 overflow-x-auto">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', maxWidth: '780px', margin: '0 auto' }}>
                        {pageWorkers.map(w => <HelmetTag key={w.id} worker={w} logoUrl={logoUrl} />)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
