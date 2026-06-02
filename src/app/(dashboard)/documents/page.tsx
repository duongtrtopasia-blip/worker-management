'use client';

import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, CheckCircle2, AlertTriangle, XCircle, Loader2, FolderOpen, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

type DocStatus = 'valid' | 'expiring' | 'expired' | 'missing';

const DOC_LABELS: Record<string, string> = {
  health_certificate: 'Sức Khỏe',
  cccd_notarized: 'CCCD',
  safety_card: 'Thẻ ATLĐ',
  safety_test: 'Kiểm Tra',
  safety_commitment: 'Cam Kết',
};

export default function DocumentsPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [docsData, setDocsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('Tất cả công nhân');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: wData, error: wError } = await supabase.from('workers').select('*').order('created_at', { ascending: false });
    const { data: dData } = await supabase.from('documents').select('*');
    if (wError) toast.error('Lỗi khi tải công nhân');
    else setWorkers(wData || []);
    if (dData) setDocsData(dData);
    setLoading(false);
  };

  const getDocStatus = (workerId: string, type: string): DocStatus => {
    const doc = docsData.find(d => d.worker_id === workerId && d.doc_type === type);
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
    const types = ['health_certificate', 'cccd_notarized', 'safety_card', 'safety_test', 'safety_commitment'];
    let validCount = 0, hasWarning = false, hasError = false;
    const statuses = types.map(t => {
      const status = getDocStatus(workerId, t);
      if (status === 'valid') validCount++;
      if (status === 'expiring') { hasWarning = true; validCount++; }
      if (status === 'missing' || status === 'expired') hasError = true;
      return { type: t, status };
    });
    return { validCount, total: types.length, hasWarning, hasError, statuses };
  };

  const filteredWorkers = workers.filter(w => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!w.full_name?.toLowerCase().includes(q) && !w.mnv?.toLowerCase().includes(q)) return false;
    }
    const summary = getWorkerSummary(w.id);
    if (filter === 'Có cảnh báo / Thiếu' && !summary.hasError && !summary.hasWarning) return false;
    if (filter === 'Hồ sơ đầy đủ' && (summary.hasError || summary.hasWarning)) return false;
    return true;
  });

  const handleExportExcel = () => {
    const rows: any[] = [];
    workers.forEach(w => {
      const summary = getWorkerSummary(w.id);
      if (summary.hasError || summary.hasWarning) {
        const txt = (s: DocStatus) => s === 'missing' ? 'Thiếu' : s === 'expired' ? 'Hết hạn' : s === 'expiring' ? 'Sắp hết hạn' : 'OK';
        rows.push({
          'Họ Tên': w.full_name, 'MNV': w.mnv, 'Tổ Đội': w.team,
          'Sức Khỏe': txt(summary.statuses.find(s => s.type === 'health_certificate')!.status),
          'CCCD': txt(summary.statuses.find(s => s.type === 'cccd_notarized')!.status),
          'Thẻ ATLĐ': txt(summary.statuses.find(s => s.type === 'safety_card')!.status),
          'Kiểm Tra': txt(summary.statuses.find(s => s.type === 'safety_test')!.status),
          'Cam Kết': txt(summary.statuses.find(s => s.type === 'safety_commitment')!.status),
        });
      }
    });
    if (rows.length === 0) { toast.success('Tuyệt vời! Toàn bộ công nhân đều đầy đủ hồ sơ.'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Thiếu Hồ Sơ');
    XLSX.writeFile(wb, 'Danh_Sach_Thieu_Ho_So.xlsx');
  };

  const renderStatusCell = (status: DocStatus) => {
    if (status === 'valid') return (
      <div className="flex justify-center">
        <span className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center" title="Đã có / Còn hạn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </span>
      </div>
    );
    if (status === 'expiring') return (
      <div className="flex justify-center">
        <span className="w-7 h-7 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center" title="Sắp hết hạn (≤30 ngày)">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        </span>
      </div>
    );
    return (
      <div className="flex justify-center">
        <span className="w-7 h-7 rounded-full bg-red-50 border border-red-100 flex items-center justify-center" title="Chưa nộp / Đã hết hạn">
          <XCircle className="w-4 h-4 text-red-500" />
        </span>
      </div>
    );
  };

  // Summary stats
  const totalWorkers = workers.length;
  const missingCount = workers.filter(w => getWorkerSummary(w.id).hasError).length;
  const warningCount = workers.filter(w => { const s = getWorkerSummary(w.id); return !s.hasError && s.hasWarning; }).length;
  const completeCount = totalWorkers - missingCount - warningCount;

  return (
    <div className="p-6 space-y-6">

      {/* ===== PAGE HEADER ===== */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
            <FolderOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tình Trạng Hồ Sơ</h1>
            <p className="text-sm text-gray-400 mt-0.5">Theo dõi và quản lý giấy tờ công nhân</p>
          </div>
        </div>
        <Button onClick={handleExportExcel} size="sm" variant="outline" className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
          <Download className="h-4 w-4" /> Xuất Excel Thiếu Hồ Sơ
        </Button>
      </div>

      {/* ===== SUMMARY STATS ===== */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{completeCount}</p>
            <p className="text-xs text-gray-500">Đầy đủ hồ sơ</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{warningCount}</p>
            <p className="text-xs text-gray-500">Sắp hết hạn</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-50">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{missingCount}</p>
            <p className="text-xs text-gray-500">Thiếu / Hết hạn</p>
          </div>
        </div>
      </div>

      {/* ===== SEARCH & FILTERS ===== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm kiếm công nhân, Mã NV..."
            className="pl-9 h-10 border-gray-200 rounded-lg"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Filter className="w-3.5 h-3.5" />
        </div>
        <Select value={filter} onValueChange={val => setFilter(val || 'Tất cả công nhân')}>
          <SelectTrigger className="h-10 w-[200px] border-gray-200 rounded-lg text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Tất cả công nhân">Tất cả công nhân</SelectItem>
            <SelectItem value="Có cảnh báo / Thiếu">Có cảnh báo / Thiếu</SelectItem>
            <SelectItem value="Hồ sơ đầy đủ">Hồ sơ đầy đủ 100%</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400 ml-auto">Hiển thị <strong className="text-gray-700">{filteredWorkers.length}</strong> / {workers.length}</span>
      </div>

      {/* ===== TABLE ===== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-b border-gray-100">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pl-5">Công Nhân</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tổ Đội</TableHead>
              {Object.entries(DOC_LABELS).map(([key, label]) => (
                <TableHead key={key} className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">{label}</TableHead>
              ))}
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Tiến Độ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-brand-blue" />
                </TableCell>
              </TableRow>
            ) : filteredWorkers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <FolderOpen className="w-10 h-10" />
                    <span className="text-sm text-gray-400">Không tìm thấy dữ liệu phù hợp</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredWorkers.map(w => {
                const summary = getWorkerSummary(w.id);
                const pct = Math.round((summary.validCount / summary.total) * 100);
                return (
                  <TableRow key={w.id} className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${summary.hasError ? 'border-l-4 border-l-red-300' : summary.hasWarning ? 'border-l-4 border-l-amber-300' : 'border-l-4 border-l-emerald-300'}`}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-brand-blue to-brand-red flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                          {w.portrait_url ? <img src={w.portrait_url} className="w-full h-full object-cover" alt={w.full_name} /> : <span className="text-white text-xs font-bold">{w.full_name?.charAt(0)}</span>}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{w.full_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{w.mnv}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{w.team}</TableCell>
                    {summary.statuses.map(s => (
                      <TableCell key={s.type} className="text-center">{renderStatusCell(s.status)}</TableCell>
                    ))}
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs font-semibold text-gray-500">{summary.validCount}/{summary.total}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ===== LEGEND ===== */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 bg-white p-4 border border-gray-100 rounded-xl shadow-sm">
        <span className="font-medium text-gray-600 mr-2">Chú thích:</span>
        <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Đã có / Còn hạn</div>
        <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> Sắp hết hạn (≤ 30 ngày)</div>
        <div className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-red-500" /> Chưa nộp / Đã hết hạn</div>
        <div className="flex items-center gap-1.5 ml-4 text-gray-400 text-[11px]">
          <span className="w-3 h-3 rounded-sm bg-red-300 inline-block" /> Sức khỏe: hết hạn sau 6 tháng kể từ ngày cấp
        </div>
      </div>
    </div>
  );
}
