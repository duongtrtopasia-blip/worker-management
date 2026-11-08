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
  CREATE:       { label: 'Tạo mới',     cls: 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]' },
  UPDATE:       { label: 'Cập nhật',    cls: 'bg-[#eef2fb] text-[#1e3a8a] border-[#c9d4f0]' },
  DELETE:       { label: 'Xóa',         cls: 'bg-[#fef2f2] text-[#b4141a] border-[#f5b5b8]' },
  REQUEST_CARD: { label: 'Trình duyệt', cls: 'bg-[#fef7e6] text-[#92400e] border-[#f5d89a]' },
  APPROVE_CARD: { label: 'Phê duyệt',   cls: 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]' },
  PRINT_CARD:   { label: 'In thẻ',      cls: 'bg-[#eef2fb] text-[#1e3a8a] border-[#c9d4f0]' },
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
          <div className="p-2.5 rounded-[10px] bg-[#1e3a8a]">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-[#0f1b33] tracking-[-0.02em]">Nhật ký hệ thống</h1>
            <p className="text-[13px] text-[#5b6577] mt-0.5">Ghi lại toàn bộ thay đổi trên hệ thống (200 giao dịch gần nhất)</p>
          </div>
        </div>
        <button onClick={fetchLogs} className="btn-secondary">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      {/* ===== SEARCH ===== */}
      <div className="bg-white rounded-[12px] border border-[#e3e8ef] shadow-[0_1px_2px_rgba(15,27,51,0.04)] p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#6b7586]" />
          <input
            placeholder="Tìm kiếm theo tài khoản, đối tượng, chi tiết..."
            className="w-full pl-9 pr-4 h-10 bg-white border border-[#8592a4] rounded-[10px] text-[13px] text-[#0f1b33] placeholder:text-[#6b7586] focus:outline-none focus:border-[#1e3a8a] focus:ring-[3px] focus:ring-[#c9d4f0]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ===== TABLE ===== */}
      <div className="bg-white rounded-[12px] border border-[#e3e8ef] shadow-[0_1px_2px_rgba(15,27,51,0.04)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f7f9fc] border-b border-[#e3e8ef]">
              <TableHead className="text-[11px] font-extrabold text-[#5b6577] uppercase tracking-wider pl-5 w-[170px]">Thời Gian</TableHead>
              <TableHead className="text-[11px] font-extrabold text-[#5b6577] uppercase tracking-wider">Tài Khoản</TableHead>
              <TableHead className="text-[11px] font-extrabold text-[#5b6577] uppercase tracking-wider">Quyền</TableHead>
              <TableHead className="text-[11px] font-extrabold text-[#5b6577] uppercase tracking-wider">Hành Động</TableHead>
              <TableHead className="text-[11px] font-extrabold text-[#5b6577] uppercase tracking-wider">Đối Tượng</TableHead>
              <TableHead className="text-[11px] font-extrabold text-[#5b6577] uppercase tracking-wider pr-5">Chi Tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#1e3a8a]" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-[#8592a4]">
                    <ClipboardList className="w-10 h-10" />
                    <span className="text-sm text-[#5b6577]">Chưa có lịch sử thao tác</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => {
                const actionCfg = ACTION_CONFIG[log.action] || { label: log.action, cls: 'bg-[#f3f5f9] text-[#5b6577] border-[#e3e8ef]' };
                return (
                  <TableRow key={log.id} className="border-b border-[#e3e8ef] hover:bg-[#f7f9fc] transition-colors">
                    <TableCell className="pl-5">
                      <p className="text-sm font-bold text-[#0f1b33] font-mono">
                        {format(new Date(log.created_at), 'HH:mm:ss', { locale: vi })}
                      </p>
                      <p className="text-xs text-[#5b6577] font-mono">
                        {format(new Date(log.created_at), 'dd/MM/yyyy', { locale: vi })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#1e3a8a] text-white text-[11px] font-bold shrink-0">
                          {log.actor?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-bold text-sm text-[#0f1b33]">{log.actor}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${log.role === 'admin' ? 'bg-[#fef2f2] text-[#b4141a] border-[#f5b5b8]' : 'bg-[#eef2fb] text-[#1e3a8a] border-[#c9d4f0]'}`}>
                        {log.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {log.role?.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${actionCfg.cls}`}>
                        {actionCfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-bold text-[#0f1b33]">{log.target}</TableCell>
                    <TableCell className="text-xs text-[#5b6577] pr-5 max-w-[220px] truncate" title={log.details}>{log.details}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#e3e8ef] text-xs text-[#5b6577] bg-[#f7f9fc]">
            Hiển thị <strong className="text-[#0f1b33]">{filtered.length}</strong> / {logs.length} giao dịch
          </div>
        )}
      </div>
    </div>
  );
}
