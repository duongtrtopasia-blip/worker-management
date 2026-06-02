'use client';

import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { Loader2, ClipboardList, RefreshCw, Shield, User, Search } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ACTION_CONFIG: Record<string, { label: string; cls: string }> = {
  CREATE:       { label: 'Tạo mới',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  UPDATE:       { label: 'Cập nhật',    cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  DELETE:       { label: 'Xóa',         cls: 'bg-red-100 text-red-700 border-red-200' },
  REQUEST_CARD: { label: 'Trình duyệt', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROVE_CARD: { label: 'Phê duyệt',   cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  PRINT_CARD:   { label: 'In thẻ',      cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setLogs(data);
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.actor?.toLowerCase().includes(q) || l.target?.toLowerCase().includes(q) || l.details?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6">

      {/* ===== PAGE HEADER ===== */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Lịch Sử Thao Tác</h1>
            <p className="text-sm text-gray-400 mt-0.5">Ghi lại toàn bộ thay đổi trên hệ thống (200 giao dịch gần nhất)</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1.5 text-gray-600">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </Button>
      </div>

      {/* ===== SEARCH ===== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm kiếm theo tài khoản, đối tượng, chi tiết..."
            className="pl-9 h-10 border-gray-200 rounded-lg"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ===== TABLE ===== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-b border-gray-100">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pl-5 w-[170px]">Thời Gian</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tài Khoản</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quyền</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành Động</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Đối Tượng</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pr-5">Chi Tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-brand-blue" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <ClipboardList className="w-10 h-10" />
                    <span className="text-sm text-gray-400">Chưa có lịch sử thao tác</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log, idx) => {
                const actionCfg = ACTION_CONFIG[log.action] || { label: log.action, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
                return (
                  <TableRow key={log.id} className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <TableCell className="pl-5">
                      <p className="text-sm font-medium text-gray-700">
                        {format(new Date(log.created_at), 'HH:mm:ss', { locale: vi })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(log.created_at), 'dd/MM/yyyy', { locale: vi })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
                          {log.actor?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-medium text-sm text-gray-900">{log.actor}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${log.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {log.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {log.role?.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold border ${actionCfg.cls}`}>
                        {actionCfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-800">{log.target}</TableCell>
                    <TableCell className="text-xs text-gray-500 pr-5 max-w-[220px] truncate" title={log.details}>{log.details}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50">
            Hiển thị <strong className="text-gray-600">{filtered.length}</strong> / {logs.length} giao dịch
          </div>
        )}
      </div>
    </div>
  );
}
