'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Upload, Printer, Download, Edit, Trash2, CheckCircle2, AlertCircle, Users, Filter } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import ImportExcelModal from '@/components/workers/ImportExcelModal';

import { updateCardStatusAction, updateCardStatusBulkAction } from '@/app/actions/worker';

/* ── Custom Filter Select ─────────────────────────────────── */
function FilterSelect({ value, onChange, options, defaultLabel }: {
  value: string;
  onChange: (v: string) => void;
  defaultLabel: string;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const isActive = value !== defaultLabel;

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allOptions = [{ value: defaultLabel, label: defaultLabel }, ...options];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`h-8 pl-3 pr-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all duration-200 whitespace-nowrap ${
          isActive
            ? 'text-white border-transparent shadow-sm'
            : 'text-gray-600 bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
        style={isActive ? { background: 'linear-gradient(135deg, #1e3a8a, #970731)' } : {}}
      >
        <span>{value}</span>
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isActive ? 'text-white/80' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-gray-100 shadow-xl z-[200] py-1.5 min-w-[170px] overflow-hidden"
          style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}
        >
          {allOptions.map(opt => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between gap-3 transition-colors ${
                  selected
                    ? 'font-semibold text-brand-blue bg-brand-blue/5'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{opt.label}</span>
                {selected && (
                  <svg className="w-3.5 h-3.5 text-brand-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [profileFilter, setProfileFilter] = useState<string>('Tất cả hồ sơ');
  const [cardFilter, setCardFilter] = useState<string>('Tất cả thẻ');
  const [teamFilter, setTeamFilter] = useState<string>('Tất cả tổ đội');
  const [positionFilter, setPositionFilter] = useState<string>('Tất cả chức danh');
  const [areaFilter, setAreaFilter] = useState<string>('Tất cả khu vực');
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState('admin');

  useEffect(() => {
    const roleMatch = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
    if (roleMatch) setUserRole(roleMatch[2]);
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    let docsData: any[] = [];
    const { data: dData, error: dError } = await supabase.from('documents').select('worker_id, doc_type');
    if (!dError && dData) docsData = dData;

    if (error) {
      toast.error('Lỗi khi tải danh sách công nhân');
    } else {
      const workersWithDocs = (data || []).map(w => {
        w.documents = docsData.filter(d => d.worker_id === w.id);
        return w;
      });
      setWorkers(workersWithDocs);
    }
    setLoading(false);
  };

  const requiredDocs = ['cccd_notarized', 'health_certificate', 'safety_card', 'safety_commitment'];
  const isProfileComplete = (worker: any) => {
    if (!worker.documents) return false;
    const uploadedDocs = worker.documents.map((d: any) => d.doc_type);
    return requiredDocs.every(doc => uploadedDocs.includes(doc));
  };

  const uniqueTeams = Array.from(new Set(workers.map(w => w.team).filter(Boolean))).sort();
  const uniquePositions = Array.from(new Set(workers.map(w => w.position).filter(Boolean))).sort();
  const uniqueAreas = Array.from(new Set(workers.map(w => w.area).filter(Boolean))).sort();

  const filteredWorkers = workers.filter(w => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const match = w.full_name?.toLowerCase().includes(query) ||
                    w.mnv?.toLowerCase().includes(query) ||
                    w.cccd?.toLowerCase().includes(query);
      if (!match) return false;
    }
    if (profileFilter === 'Đầy đủ hồ sơ' && !isProfileComplete(w)) return false;
    if (profileFilter === 'Chưa đủ hồ sơ' && isProfileComplete(w)) return false;

    if (cardFilter !== 'Tất cả thẻ') {
      const status = w.card_status || 'none';
      if (cardFilter !== status) return false;
    }
    if (teamFilter !== 'Tất cả tổ đội' && w.team !== teamFilter) return false;
    if (positionFilter !== 'Tất cả chức danh' && w.position !== positionFilter) return false;
    if (areaFilter !== 'Tất cả khu vực' && w.area !== areaFilter) return false;
    return true;
  });

  const handleDelete = async (worker: any) => {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa công nhân "${worker.full_name}" (MNV: ${worker.mnv}) không?\nThao tác này không thể hoàn tác.`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/workers/${worker.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(`Xóa thất bại: ${data.error}`); return; }
      toast.success(`Đã xóa công nhân ${worker.full_name}`);
      fetchWorkers();
    } catch (error: any) {
      toast.error(`Lỗi hệ thống: ${error.message}`);
    }
  };

  const handleCardRequest = async (workerId: string, status: string) => {
    try {
      await updateCardStatusAction(workerId, status);
      toast.success(status === 'approved' ? 'Đã phê duyệt xuất thẻ' : 'Đã trình yêu cầu cấp thẻ');
      fetchWorkers();
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const handleBulkCardRequest = async (status: string) => {
    if (checkedIds.size === 0) return;
    try {
      const ids = Array.from(checkedIds);
      await updateCardStatusBulkAction(ids, status);
      toast.success(status === 'approved' ? `Đã phê duyệt ${ids.length} thẻ` : `Đã trình yêu cầu ${ids.length} thẻ`);
      setCheckedIds(new Set());
      fetchWorkers();
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleAll = () => {
    if (checkedIds.size === filteredWorkers.length) setCheckedIds(new Set());
    else setCheckedIds(new Set(filteredWorkers.map(w => w.id)));
  };
  const allChecked = filteredWorkers.length > 0 && checkedIds.size === filteredWorkers.length;

  const cardStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      none: { label: 'Chưa cấp', cls: 'bg-gray-100 text-gray-500' },
      pending: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-700' },
      approved: { label: 'Chờ in', cls: 'bg-green-100 text-green-700' },
      issued: { label: 'Đã cấp thẻ', cls: 'bg-blue-100 text-blue-700 font-semibold' },
    };
    const s = map[status] || map.none;
    return <span className={`text-xs px-2 py-1 rounded-md ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div className="p-6 space-y-6">

      {/* ===== PAGE HEADER ===== */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quản Lý Công Nhân</h1>
            <p className="text-sm text-gray-400 mt-0.5">Tổng cộng <span className="font-semibold text-brand-blue">{workers.length}</span> công nhân</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/Mau_Nhap_Cong_Nhan.xlsx" download>
            <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-50 gap-1.5">
              <Download className="h-4 w-4" /> Tải File Mẫu
            </Button>
          </a>
          <Button variant="outline" size="sm" className="text-brand-blue border-brand-blue/40 hover:bg-brand-blue/5 gap-1.5" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import Excel
          </Button>
          <Link href="/workers/new">
            <Button size="sm" className="gap-1.5 text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
              <Plus className="h-4 w-4" /> Thêm công nhân
            </Button>
          </Link>
        </div>
      </div>

      {/* ===== BULK ACTION BAR ===== */}
      {checkedIds.size > 0 && (
        <div className="rounded-xl p-3.5 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, rgba(30,58,138,0.07) 0%, rgba(151,7,49,0.05) 100%)', border: '1px solid rgba(30,58,138,0.2)' }}>
          <p className="text-sm font-medium text-brand-blue">
            Đã chọn <span className="font-bold">{checkedIds.size}</span> / {filteredWorkers.length} công nhân
          </p>
          <div className="flex gap-2">
            {userRole === 'editor' && (
              <Button size="sm" onClick={() => handleBulkCardRequest('pending')} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                Trình phê duyệt ({checkedIds.size})
              </Button>
            )}
            {userRole === 'admin' && (
              <Button size="sm" onClick={() => handleBulkCardRequest('approved')} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                Phê duyệt hàng loạt ({checkedIds.size})
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setCheckedIds(new Set())} className="text-gray-500">
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* ===== SEARCH & FILTERS ===== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm kiếm theo Tên, Mã NV, CCCD..."
            className="pl-9 h-10 border-gray-200 focus:border-brand-blue focus:ring-brand-blue/10 rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <Filter className="w-3.5 h-3.5" /> Lọc:
          </div>

          <FilterSelect
            value={profileFilter}
            onChange={setProfileFilter}
            defaultLabel="Tất cả hồ sơ"
            options={[
              { value: 'Đầy đủ hồ sơ', label: 'Đầy đủ hồ sơ' },
              { value: 'Chưa đủ hồ sơ', label: 'Chưa đủ hồ sơ' },
            ]}
          />
          <FilterSelect
            value={cardFilter}
            onChange={setCardFilter}
            defaultLabel="Tất cả thẻ"
            options={[
              { value: 'none', label: 'Chưa cấp thẻ' },
              { value: 'pending', label: 'Chờ duyệt' },
              { value: 'approved', label: 'Đã duyệt (Chờ in)' },
              { value: 'issued', label: 'Đã cấp thẻ' },
            ]}
          />
          <FilterSelect
            value={teamFilter}
            onChange={setTeamFilter}
            defaultLabel="Tất cả tổ đội"
            options={uniqueTeams.map((t: any) => ({ value: t, label: t }))}
          />
          <FilterSelect
            value={positionFilter}
            onChange={setPositionFilter}
            defaultLabel="Tất cả chức danh"
            options={uniquePositions.map((p: any) => ({ value: p, label: p }))}
          />
          <FilterSelect
            value={areaFilter}
            onChange={setAreaFilter}
            defaultLabel="Tất cả khu vực"
            options={uniqueAreas.map((a: any) => ({ value: a, label: a }))}
          />

          {(searchQuery || profileFilter !== 'Tất cả hồ sơ' || cardFilter !== 'Tất cả thẻ' || teamFilter !== 'Tất cả tổ đội' || positionFilter !== 'Tất cả chức danh' || areaFilter !== 'Tất cả khu vực') && (
            <button
              onClick={() => { setSearchQuery(''); setProfileFilter('Tất cả hồ sơ'); setCardFilter('Tất cả thẻ'); setTeamFilter('Tất cả tổ đội'); setPositionFilter('Tất cả chức danh'); setAreaFilter('Tất cả khu vực'); }}
              className="h-8 px-3 text-xs text-red-500 hover:text-white hover:bg-red-500 rounded-xl border border-red-200 font-medium transition-all duration-200"
            >✕ Xóa bộ lọc</button>
          )}
          <span className="ml-auto text-xs text-gray-400">Hiển thị <strong className="text-gray-700">{filteredWorkers.length}</strong> / {workers.length} công nhân</span>
        </div>
      </div>

      {/* ===== TABLE ===== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="hidden md:table-header-group bg-gray-50/50 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="border-b border-gray-100">
              <TableHead className="w-10 pl-4">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 rounded border-gray-300 text-brand-blue cursor-pointer" />
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ảnh</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">MNV</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Họ & Tên</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CCCD</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tổ Đội</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Khu Vực</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hồ Sơ</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng Thái Thẻ</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right pr-4">Thao Tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Đang tải dữ liệu...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredWorkers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Users className="w-10 h-10 text-gray-200" />
                    <span className="text-sm">Không tìm thấy công nhân phù hợp</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredWorkers.map((worker) => (
                <React.Fragment key={worker.id}>
                {/* --- DESKTOP VIEW --- */}
                <TableRow className={`hidden md:table-row border-b border-gray-50 transition-colors ${checkedIds.has(worker.id) ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'}`}>
                  <TableCell className="pl-4">
                    <input type="checkbox" checked={checkedIds.has(worker.id)} onChange={(e) => toggleCheck(worker.id, e as any)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded border-gray-300 text-brand-blue cursor-pointer" />
                  </TableCell>
                  <TableCell>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-red overflow-hidden flex items-center justify-center border-2 border-white shadow-sm">
                      {worker.portrait_url ? (
                        <img src={worker.portrait_url} alt={worker.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">{worker.full_name?.charAt(0)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-brand-blue">{worker.mnv}</TableCell>
                  <TableCell className="font-medium text-gray-900">{worker.full_name}</TableCell>
                  <TableCell className="text-sm text-gray-500 font-mono">{worker.cccd}</TableCell>
                  <TableCell className="text-sm text-gray-600">{worker.team}</TableCell>
                  <TableCell className="text-sm text-gray-600">{worker.area}</TableCell>
                  <TableCell>
                    {isProfileComplete(worker) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3" /> Đầy đủ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                        <AlertCircle className="w-3 h-3" /> Còn thiếu
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!worker.card_status || worker.card_status === 'none' ? (
                      userRole === 'editor' ? (
                        <Button variant="outline" size="sm" onClick={() => handleCardRequest(worker.id, 'pending')} className="text-xs h-7 text-blue-600 border-blue-200 hover:bg-blue-50">
                          Trình duyệt
                        </Button>
                      ) : (
                        cardStatusBadge('none')
                      )
                    ) : worker.card_status === 'pending' ? (
                      userRole === 'admin' ? (
                        <Button size="sm" onClick={() => handleCardRequest(worker.id, 'approved')} className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white">
                          Phê duyệt
                        </Button>
                      ) : (
                        cardStatusBadge('pending')
                      )
                    ) : (
                      cardStatusBadge(worker.card_status)
                    )}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm" title="In hồ sơ" onClick={() => window.open(`/workers/${worker.id}/print`, '_blank')} className="h-8 w-8 p-0 hover:bg-gray-100 hover:text-brand-blue">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Link href={`/workers/${worker.id}/edit`}>
                        <Button variant="ghost" size="sm" title="Sửa" className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-brand-blue">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {userRole === 'admin' && (
                        <Button variant="ghost" size="sm" title="Xóa" onClick={() => handleDelete(worker)} className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* --- MOBILE VIEW --- */}
                <tr className="md:hidden border-b border-gray-100 bg-white">
                  <td colSpan={9} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="pt-1">
                        <input type="checkbox" checked={checkedIds.has(worker.id)} onChange={(e) => toggleCheck(worker.id, e as any)} className="w-5 h-5 rounded border-gray-300 text-brand-blue" />
                      </div>
                      <div className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-brand-blue to-brand-red overflow-hidden flex items-center justify-center border border-gray-200">
                        {worker.portrait_url ? (
                          <img src={worker.portrait_url} alt={worker.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-sm font-bold">{worker.full_name?.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-gray-900 truncate">{worker.full_name}</p>
                          <span className="font-mono text-xs font-semibold text-brand-blue shrink-0">{worker.mnv}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono mb-2">CCCD: {worker.cccd}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">{worker.team}</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">{worker.area}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="scale-90 origin-left">
                            {!worker.card_status || worker.card_status === 'none' ? (
                              userRole === 'editor' ? (
                                <Button variant="outline" size="sm" onClick={() => handleCardRequest(worker.id, 'pending')} className="text-[10px] h-6 px-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                                  Trình duyệt
                                </Button>
                              ) : cardStatusBadge('none')
                            ) : worker.card_status === 'pending' ? (
                              userRole === 'admin' ? (
                                <Button size="sm" onClick={() => handleCardRequest(worker.id, 'approved')} className="text-[10px] h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                  Phê duyệt
                                </Button>
                              ) : cardStatusBadge('pending')
                            ) : cardStatusBadge(worker.card_status)}
                          </div>

                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => window.open(`/workers/${worker.id}/print`, '_blank')} className="h-7 w-7 p-0 border-gray-200 rounded-full">
                              <Printer className="h-3 w-3 text-gray-500" />
                            </Button>
                            <Link href={`/workers/${worker.id}/edit`}>
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-gray-200 rounded-full">
                                <Edit className="h-3 w-3 text-brand-blue" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ImportExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { fetchWorkers(); setImportOpen(false); }}
      />
    </div>
  );
}
