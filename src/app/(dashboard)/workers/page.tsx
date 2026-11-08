'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Upload,
  Printer,
  Download,
  Edit,
  Trash2,
  Eye,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  fetchWorkersCached,
  fetchDocumentsCached,
  getCachedWorkers,
  getCachedDocuments,
  invalidateDataCache,
  updateCachedWorkers,
} from '@/lib/data-cache';
import ImportExcelModal from '@/components/workers/ImportExcelModal';
import ImportSafetyCardModal from '@/components/workers/ImportSafetyCardModal';
import { updateCardStatusAction, updateCardStatusBulkAction } from '@/app/actions/worker';

function mergeWorkersWithDocs(allWorkers: any[], docsData: any[]) {
  const docsMap = new Map<string, any[]>();
  docsData.forEach((d) => {
    if (!docsMap.has(d.worker_id)) docsMap.set(d.worker_id, []);
    docsMap.get(d.worker_id)!.push(d);
  });
  return allWorkers.map((w) => ({
    ...w,
    documents: docsMap.get(w.id) || [],
  }));
}

/* ── Custom Filter Select (SCMP Vincons Design) ─────────────────────────────────── */
function FilterSelect({
  value,
  onChange,
  options,
  defaultLabel,
  prefixLabel,
  searchable = true,
}: {
  value: string;
  onChange: (v: string) => void;
  defaultLabel: string;
  prefixLabel?: string;
  options: { value: string; label: string }[];
  searchable?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const isActive = value !== defaultLabel;

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allOptions = [{ value: defaultLabel, label: defaultLabel }, ...options];
  const filteredOptions = allOptions.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );
  const selectedLabel = allOptions.find((o) => o.value === value)?.label || value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          height: '38px',
          padding: '0 12px',
          border: isActive ? '1px solid #1e3a8a' : '1px solid #8592a4',
          borderRadius: '8px',
          fontSize: '13px',
          backgroundColor: isActive ? '#eef2fb' : '#ffffff',
          fontWeight: isActive ? 700 : 600,
          color: isActive ? '#1e3a8a' : '#0f1b33',
        }}
        className="flex items-center gap-2 whitespace-nowrap hover:border-[#1e3a8a] transition-colors"
      >
        <span>
          {prefixLabel ? `${prefixLabel}: ` : ''}
          {selectedLabel}
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          style={{ color: isActive ? '#1e3a8a' : '#5b6577' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 bg-white z-[200] py-1.5 min-w-[210px] flex flex-col"
          style={{
            borderRadius: '12px',
            border: '1px solid #e3e8ef',
            boxShadow: '0 8px 24px -8px rgba(15,27,51,0.18)',
          }}
        >
          {searchable && options.length > 5 && (
            <div className="px-2 pb-1.5 border-b border-[#e3e8ef] mb-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b7586]" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-7 pr-2 py-1.5 bg-[#f7f9fc] border border-[#8592a4] rounded-md focus:outline-none focus:border-[#1e3a8a]"
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="max-h-[260px] overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const selected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between gap-3 transition-colors ${
                      selected
                        ? 'font-bold text-[#1e3a8a] bg-[#eef2fb]'
                        : 'text-[#334155] hover:bg-[#f7f9fc]'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {selected && (
                      <svg
                        className="w-3.5 h-3.5 text-[#1e3a8a] shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3.5 py-3 text-xs text-center text-[#5b6577]">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkersPage() {
  const router = useRouter();
  const initialW = getCachedWorkers();
  const initialD = getCachedDocuments();
  const [workers, setWorkers] = useState<any[]>(() =>
    initialW && initialD ? mergeWorkersWithDocs(initialW, initialD) : []
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(!(initialW && initialD));
  const [importOpen, setImportOpen] = useState(false);
  const [importSafetyOpen, setImportSafetyOpen] = useState(false);
  const [profileFilter, setProfileFilter] = useState<string>('Tất cả hồ sơ');
  const [cardFilter, setCardFilter] = useState<string>('Tất cả thẻ');
  const [teamFilter, setTeamFilter] = useState<string>('Tất cả tổ đội');
  const [positionFilter, setPositionFilter] = useState<string>('Tất cả chức danh');
  const [areaFilter, setAreaFilter] = useState<string>('Tất cả khu vực');
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState('admin');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    const roleMatch = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
    if (roleMatch) setUserRole(roleMatch[2]);
    fetchWorkers(false);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, profileFilter, cardFilter, teamFilter, positionFilter, areaFilter]);

  const fetchWorkers = async (force = true) => {
    if (force) {
      invalidateDataCache();
      if (workers.length === 0) setLoading(true);
    }
    try {
      const [allWorkers, docsData] = await Promise.all([
        fetchWorkersCached(force),
        fetchDocumentsCached(force),
      ]);
      setWorkers(mergeWorkersWithDocs(allWorkers, docsData));
    } catch {
      toast.error('Lỗi khi tải danh sách công nhân');
    } finally {
      setLoading(false);
    }
  };

  const requiredDocs = ['cccd_notarized', 'health_certificate', 'safety_card', 'safety_commitment'];
  const isProfileComplete = (worker: any) => {
    if (!worker.documents) return false;
    const uploadedDocs = worker.documents.map((d: any) => d.doc_type);
    return requiredDocs.every((doc) => uploadedDocs.includes(doc));
  };

  const uniqueTeams = useMemo(
    () => Array.from(new Set(workers.map((w) => w.team).filter(Boolean))).sort() as string[],
    [workers]
  );
  const uniquePositions = useMemo(
    () => Array.from(new Set(workers.map((w) => w.position).filter(Boolean))).sort() as string[],
    [workers]
  );
  const uniqueAreas = useMemo(
    () => Array.from(new Set(workers.map((w) => w.area).filter(Boolean))).sort() as string[],
    [workers]
  );

  const filteredWorkers = useMemo(
    () =>
      workers.filter((w) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const match =
            w.full_name?.toLowerCase().includes(query) ||
            w.mnv?.toLowerCase().includes(query) ||
            w.cccd?.toLowerCase().includes(query) ||
            w.phone?.toLowerCase().includes(query);
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
      }),
    [workers, searchQuery, profileFilter, cardFilter, teamFilter, positionFilter, areaFilter]
  );

  const totalItems = filteredWorkers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWorkers = filteredWorkers.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = async (worker: any) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa công nhân "${worker.full_name}" (MNV: ${worker.mnv}) không?\nThao tác này không thể hoàn tác.`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/workers/${worker.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`Xóa thất bại: ${data.error}`);
        return;
      }
      toast.success(`Đã xóa công nhân ${worker.full_name}`);
      updateCachedWorkers((prev) => prev.filter((w) => w.id !== worker.id));
      setWorkers((prev) => prev.filter((w) => w.id !== worker.id));
    } catch (error: any) {
      toast.error(`Lỗi hệ thống: ${error.message}`);
    }
  };

  const handleCardRequest = async (workerId: string, status: string) => {
    try {
      await updateCardStatusAction(workerId, status);
      toast.success(
        status === 'approved' ? 'Đã phê duyệt xuất thẻ' : 'Đã trình yêu cầu cấp thẻ'
      );
      updateCachedWorkers((prev) =>
        prev.map((w) => (w.id === workerId ? { ...w, card_status: status } : w))
      );
      setWorkers((prev) =>
        prev.map((w) => (w.id === workerId ? { ...w, card_status: status } : w))
      );
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const handleBulkCardRequest = async (status: string) => {
    if (checkedIds.size === 0) return;
    try {
      const ids = Array.from(checkedIds);
      const idSet = new Set(ids);
      await updateCardStatusBulkAction(ids, status);
      toast.success(
        status === 'approved'
          ? `Đã phê duyệt ${ids.length} thẻ`
          : `Đã trình yêu cầu ${ids.length} thẻ`
      );
      setCheckedIds(new Set());
      updateCachedWorkers((prev) =>
        prev.map((w) => (idSet.has(w.id) ? { ...w, card_status: status } : w))
      );
      setWorkers((prev) =>
        prev.map((w) => (idSet.has(w.id) ? { ...w, card_status: status } : w))
      );
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra');
    }
  };

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
    if (checkedIds.size === filteredWorkers.length) setCheckedIds(new Set());
    else setCheckedIds(new Set(filteredWorkers.map((w) => w.id)));
  };
  const allChecked = filteredWorkers.length > 0 && checkedIds.size === filteredWorkers.length;

  const cardStatusBadge = (status: string) => {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      none: { label: 'Chưa cấp', bg: '#eef1f5', color: '#334155' },
      pending: { label: 'Chờ duyệt', bg: '#fdf3dc', color: '#92400e' },
      approved: { label: 'Chờ in', bg: '#e6f5ee', color: '#047857' },
      issued: { label: 'Đã cấp thẻ', bg: '#eef2fb', color: '#1e3a8a' },
    };
    const s = map[status] || map.none;
    return (
      <span className="scmp-badge" style={{ background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatDob = (dob?: string) => {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return dob;
    const age = new Date().getFullYear() - d.getFullYear();
    return `${d.toLocaleDateString('vi-VN')} (${age} tuổi)`;
  };

  const hasFilters =
    searchQuery !== '' ||
    profileFilter !== 'Tất cả hồ sơ' ||
    cardFilter !== 'Tất cả thẻ' ||
    teamFilter !== 'Tất cả tổ đội' ||
    positionFilter !== 'Tất cả chức danh' ||
    areaFilter !== 'Tất cả khu vực';

  return (
    <div style={{ padding: '24px 28px' }} className="max-w-[1360px] mx-auto flex flex-col min-h-full">
      {/* Page Header & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f1b33' }}>
            Danh sách công nhân
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5b6577' }}>
            Tổng số{' '}
            <strong className="text-[#0f1b33]">
              {workers.length.toLocaleString('vi-VN')}
            </strong>{' '}
            hồ sơ công nhân đang làm việc tại dự án Mỹ Lâm
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a href="/Mau_Nhap_Cong_Nhan.xlsx" download className="no-underline">
            <button type="button" className="btn-secondary">
              <Download className="w-4 h-4" />
              <span>File Mẫu</span>
            </button>
          </a>

          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              const toastId = toast.loading('Đang tạo danh sách huấn luyện...');
              try {
                const res = await fetch('/api/export-training', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ workerIds: Array.from(checkedIds) }),
                });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `DanhSachHL_Nhom3_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                toast.success('Xuất file thành công!', { id: toastId });
              } catch {
                toast.error('Có lỗi khi xuất file', { id: toastId });
              }
            }}
          >
            <Download className="w-4 h-4" />
            <span>Xuất DS Huấn Luyện</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              const toastId = toast.loading('Đang tạo danh sách xin phê duyệt...');
              try {
                const res = await fetch('/api/export-approval', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ workerIds: Array.from(checkedIds) }),
                });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `DanhSachPheDuyet_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                toast.success('Xuất file thành công!', { id: toastId });
              } catch {
                toast.error('Có lỗi khi xuất file', { id: toastId });
              }
            }}
          >
            <Download className="w-4 h-4" />
            <span>Xuất File Xin Duyệt</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setImportSafetyOpen(true)}
          >
            <Upload className="w-4 h-4" />
            <span>Cập nhật Thẻ</span>
          </button>

          <button type="button" className="btn-secondary" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          <Link href="/workers/new" className="no-underline">
            <button type="button" className="btn-primary">
              <Plus className="w-4 h-4" />
              <span>Thêm mới công nhân</span>
            </button>
          </Link>
        </div>
      </div>

      {/* FILTER TOOLBAR CARD */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e3e8ef',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search bar with icon */}
        <div className="relative flex-1 min-w-[260px]">
          <Search
            className="w-4 h-4"
            style={{ position: 'absolute', left: '12px', top: '11px', color: '#6b7586' }}
          />
          <input
            type="text"
            placeholder="Tìm theo tên, MNV, số CCCD, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px 0 36px',
              border: '1px solid #8592a4',
              borderRadius: '8px',
              fontSize: '13px',
              background: '#ffffff',
              color: '#0f1b33',
            }}
            className="outline-none focus:!border-[#1e3a8a] focus:ring-[3px] focus:ring-[#c9d4f0] transition-all"
          />
        </div>

        <FilterSelect
          value={areaFilter}
          onChange={setAreaFilter}
          defaultLabel="Tất cả khu vực"
          options={uniqueAreas.map((a) => ({ value: a, label: a }))}
        />

        <FilterSelect
          value={teamFilter}
          onChange={setTeamFilter}
          defaultLabel="Tất cả tổ đội"
          options={uniqueTeams.map((t) => ({ value: t, label: t }))}
        />

        <FilterSelect
          value={positionFilter}
          onChange={setPositionFilter}
          defaultLabel="Tất cả chức danh"
          options={uniquePositions.map((p) => ({ value: p, label: p }))}
        />

        <FilterSelect
          value={profileFilter}
          onChange={setProfileFilter}
          defaultLabel="Tất cả hồ sơ"
          options={[
            { value: 'Đầy đủ hồ sơ', label: 'Đầy đủ hồ sơ' },
            { value: 'Chưa đủ hồ sơ', label: 'Chưa đủ hồ sơ' },
          ]}
          searchable={false}
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
          searchable={false}
        />

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setProfileFilter('Tất cả hồ sơ');
              setCardFilter('Tất cả thẻ');
              setTeamFilter('Tất cả tổ đội');
              setPositionFilter('Tất cả chức danh');
              setAreaFilter('Tất cả khu vực');
            }}
            style={{
              border: 'none',
              background: 'none',
              color: '#b4141a',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'underline',
              padding: '0 4px',
            }}
          >
            Đặt lại
          </button>
        )}
      </div>

      {/* BULK ACTION BAR */}
      {checkedIds.size > 0 && (
        <div
          style={{
            background: '#eef2fb',
            border: '1px solid #c9d4f0',
            borderRadius: '8px',
            padding: '10px 16px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a' }}>
              Đã chọn {checkedIds.size} / {filteredWorkers.length} công nhân
            </span>
          </div>
          <div className="flex items-center gap-2">
            {userRole === 'editor' && (
              <button
                type="button"
                onClick={() => handleBulkCardRequest('pending')}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: '1px solid #1e3a8a',
                  background: '#ffffff',
                  color: '#1e3a8a',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Trình phê duyệt ({checkedIds.size})
              </button>
            )}
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => handleBulkCardRequest('approved')}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#1e3a8a',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Phê duyệt hàng loạt ({checkedIds.size})
              </button>
            )}
            <button
              type="button"
              onClick={() => setCheckedIds(new Set())}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #8592a4',
                background: '#ffffff',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* MAIN DATA TABLE CARD (Desktop) */}
      <div
        className="hidden md:flex flex-col flex-1"
        style={{
          background: '#ffffff',
          border: '1px solid #e3e8ef',
          borderRadius: '12px',
          boxShadow: '0 1px 2px rgba(15,27,51,0.05)',
          overflow: 'hidden',
        }}
      >
        <div className="overflow-x-auto flex-1">
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  background: '#f7f9fc',
                  borderBottom: '1px solid #e3e8ef',
                  color: '#5b6577',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                <th style={{ padding: '12px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    style={{ width: '16px', height: '16px', accentColor: '#1e3a8a', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '12px 16px' }}>Công nhân</th>
                <th style={{ padding: '12px 16px' }}>CCCD / Ngày sinh</th>
                <th style={{ padding: '12px 16px' }}>Khu vực / Tổ đội</th>
                <th style={{ padding: '12px 16px' }}>Số điện thoại</th>
                <th style={{ padding: '12px 16px' }}>Trạng thái thẻ</th>
                <th style={{ padding: '12px 16px' }}>Hồ sơ</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-[#5b6577]">
                      <div className="w-8 h-8 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium">Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedWorkers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-[#5b6577]">
                      <Users className="w-10 h-10 text-[#c5cedb]" />
                      <span className="text-sm font-medium">Không tìm thấy công nhân phù hợp</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedWorkers.map((worker, idx) => {
                  const isSelected = checkedIds.has(worker.id);
                  const complete = isProfileComplete(worker);
                  const dobStr = formatDob(worker.date_of_birth);
                  return (
                    <tr
                      key={worker.id}
                      onClick={() => router.push(`/workers/${worker.id}`)}
                      style={{
                        borderBottom: '1px solid #e3e8ef',
                        backgroundColor: isSelected ? '#eef2fb' : undefined,
                      }}
                      className="hover:bg-[#f7f9fc] transition-colors cursor-pointer"
                    >
                      <td
                        style={{ padding: '12px 16px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleCheck(worker.id, e as any)}
                          style={{
                            width: '16px',
                            height: '16px',
                            accentColor: '#1e3a8a',
                            cursor: 'pointer',
                          }}
                        />
                      </td>

                      {/* Công nhân */}
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-3">
                          {worker.portrait_url ? (
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: idx % 3 === 1 ? '#970731' : '#1e3a8a',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                overflow: 'hidden',
                              }}
                            >
                              {getInitials(worker.full_name)}
                            </div>
                          ) : (
                            <div
                              title="Chưa có ảnh thẻ"
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#eef1f5',
                                color: '#5b6577',
                                fontWeight: 700,
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                border: '1px dashed #8592a4',
                              }}
                            >
                              ?
                            </div>
                          )}
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                color: '#0f1b33',
                                fontSize: '14px',
                              }}
                            >
                              {worker.full_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#5b6577' }}>
                              MNV: {worker.mnv}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* CCCD / Ngày sinh */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f1b33' }} className="font-mono">
                          {worker.cccd || '—'}
                        </div>
                        {dobStr && (
                          <div style={{ fontSize: '12px', color: '#5b6577' }}>{dobStr}</div>
                        )}
                      </td>

                      {/* Khu vực / Tổ đội */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f1b33' }}>
                          {worker.area || 'Chưa phân khu vực'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#5b6577' }}>
                          {worker.team || 'Chưa phân tổ'}
                          {worker.position ? ` • ${worker.position}` : ''}
                        </div>
                      </td>

                      {/* Số điện thoại */}
                      <td
                        style={{
                          padding: '12px 16px',
                          fontWeight: 600,
                          color: '#334155',
                        }}
                      >
                        {worker.phone || '—'}
                      </td>

                      {/* Trạng thái thẻ */}
                      <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                        {!worker.card_status || worker.card_status === 'none' ? (
                          userRole === 'editor' ? (
                            <button
                              type="button"
                              onClick={() => handleCardRequest(worker.id, 'pending')}
                              style={{
                                height: '28px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                border: '1px solid #1e3a8a',
                                background: '#ffffff',
                                color: '#1e3a8a',
                                fontSize: '12px',
                                fontWeight: 700,
                              }}
                            >
                              Trình duyệt
                            </button>
                          ) : (
                            cardStatusBadge('none')
                          )
                        ) : worker.card_status === 'pending' ? (
                          userRole === 'admin' ? (
                            <button
                              type="button"
                              onClick={() => handleCardRequest(worker.id, 'approved')}
                              style={{
                                height: '28px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#047857',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 700,
                              }}
                            >
                              Phê duyệt
                            </button>
                          ) : (
                            cardStatusBadge('pending')
                          )
                        ) : (
                          cardStatusBadge(worker.card_status)
                        )}
                      </td>

                      {/* Hồ sơ */}
                      <td style={{ padding: '12px 16px' }}>
                        {complete ? (
                          <span
                            className="scmp-badge"
                            style={{ background: '#e6f5ee', color: '#047857' }}
                          >
                            Đủ hồ sơ
                          </span>
                        ) : !worker.portrait_url ? (
                          <span
                            className="scmp-badge"
                            style={{ background: '#fdecec', color: '#b4141a' }}
                          >
                            Thiếu ảnh thẻ
                          </span>
                        ) : (
                          <span
                            className="scmp-badge"
                            style={{ background: '#fdf3dc', color: '#92400e' }}
                          >
                            Còn thiếu
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td
                        style={{ padding: '12px 16px', textAlign: 'right' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex gap-1.5">
                          <Link href={`/workers/${worker.id}`} title="Xem hồ sơ">
                            <button
                              type="button"
                              aria-label="Xem hồ sơ"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                border: '1px solid #e3e8ef',
                                background: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#334155',
                              }}
                              className="hover:!border-[#1e3a8a] hover:!text-[#1e3a8a] transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>

                          <button
                            type="button"
                            title="In hồ sơ"
                            aria-label="In hồ sơ"
                            onClick={() => window.open(`/workers/${worker.id}/print`, '_blank')}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid #e3e8ef',
                              background: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#334155',
                            }}
                            className="hover:!border-[#1e3a8a] hover:!text-[#1e3a8a] transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <Link href={`/workers/${worker.id}/edit`} title="Chỉnh sửa">
                            <button
                              type="button"
                              aria-label="Chỉnh sửa"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                border: '1px solid #e3e8ef',
                                background: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#334155',
                              }}
                              className="hover:!border-[#1e3a8a] hover:!text-[#1e3a8a] transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </Link>

                          {userRole === 'admin' && (
                            <button
                              type="button"
                              title="Xóa công nhân"
                              aria-label="Xóa công nhân"
                              onClick={() => handleDelete(worker)}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                border: '1px solid #e3e8ef',
                                background: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#b4141a',
                              }}
                              className="hover:!bg-[#fdecec] hover:!border-[#b4141a] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        <div
          style={{
            padding: '12px 20px',
            background: '#ffffff',
            borderTop: '1px solid #e3e8ef',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div className="flex items-center gap-3" style={{ fontSize: '13px', color: '#5b6577' }}>
            <span>
              Hiển thị{' '}
              <strong style={{ color: '#0f1b33' }}>
                {totalItems === 0 ? 0 : startIndex + 1} -{' '}
                {Math.min(startIndex + itemsPerPage, totalItems)}
              </strong>{' '}
              trong tổng số{' '}
              <strong style={{ color: '#0f1b33' }}>{totalItems.toLocaleString('vi-VN')}</strong>{' '}
              công nhân
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                height: '32px',
                border: '1px solid #8592a4',
                borderRadius: '6px',
                padding: '0 8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0f1b33',
              }}
            >
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
              <option value={100}>100 / trang</option>
              <option value={200}>200 / trang</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #8592a4',
                background: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                color: currentPage === 1 ? '#6b7586' : '#0f1b33',
              }}
              className="disabled:opacity-50"
            >
              ← Trước
            </button>
            <span
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                background: '#1e3a8a',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #8592a4',
                background: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                color: currentPage === totalPages ? '#6b7586' : '#0f1b33',
              }}
              className="disabled:opacity-50"
            >
              Sau →
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE CARD LIST (MobileApp.dc.html) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="py-12 text-center text-[#5b6577] text-sm">Đang tải dữ liệu...</div>
        ) : paginatedWorkers.length === 0 ? (
          <div className="py-12 text-center text-[#5b6577] text-sm">
            Không tìm thấy công nhân phù hợp
          </div>
        ) : (
          paginatedWorkers.map((worker) => {
            const complete = isProfileComplete(worker);
            return (
              <div
                key={worker.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e3e8ef',
                  borderLeft: !worker.portrait_url
                    ? '4px solid #e31c23'
                    : !complete
                    ? '4px solid #d97706'
                    : '1px solid #e3e8ef',
                  borderRadius: '12px',
                  padding: '14px',
                  boxShadow: '0 1px 2px rgba(15,27,51,0.05)',
                }}
              >
                <div className="flex gap-3 items-start">
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: worker.portrait_url ? '#1e3a8a' : '#eef1f5',
                      color: worker.portrait_url ? '#ffffff' : '#5b6577',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: worker.portrait_url ? 'none' : '1px dashed #8592a4',
                    }}
                  >
                    {worker.portrait_url ? getInitials(worker.full_name) : '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f1b33' }}>
                        {worker.full_name}
                      </div>
                      {cardStatusBadge(worker.card_status || 'none')}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#1e3a8a',
                        marginTop: '2px',
                      }}
                    >
                      MNV: {worker.mnv}
                    </div>
                    <div style={{ fontSize: '12px', color: '#5b6577', marginTop: '4px' }}>
                      {worker.area || 'Chưa phân khu'} • {worker.team || 'Chưa phân tổ'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5b6577', marginTop: '2px' }}>
                      CCCD: {worker.cccd || '—'}
                      {worker.phone ? ` • SĐT: ${worker.phone}` : ''}
                    </div>
                  </div>
                </div>

                <div
                  className="flex gap-2 pt-2.5 mt-2.5"
                  style={{ borderTop: '1px solid #f0f3f8' }}
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/workers/${worker.id}`)}
                    style={{
                      flex: 1,
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #8592a4',
                      background: '#ffffff',
                      color: '#0f1b33',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Xem chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/workers/${worker.id}/edit`)}
                    style={{
                      flex: 1,
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #1e3a8a',
                      background: '#eef2fb',
                      color: '#1e3a8a',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ImportExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setImportOpen(false);
          fetchWorkers();
        }}
      />

      <ImportSafetyCardModal
        open={importSafetyOpen}
        onClose={() => setImportSafetyOpen(false)}
        onImported={() => {
          setImportSafetyOpen(false);
          fetchWorkers();
        }}
      />
    </div>
  );
}
