'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Upload, Printer, Download, ExternalLink, FileText, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import ImportExcelModal from '@/components/workers/ImportExcelModal';

export default function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Lỗi khi tải danh sách công nhân');
      console.error(error);
    } else {
      setWorkers(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (worker: any) => {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa công nhân "${worker.full_name}" (MNV: ${worker.mnv}) không?\nThao tác này không thể hoàn tác.`);
    if (!confirmed) return;

    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', worker.id);

    if (error) {
      toast.error(`Xóa thất bại: ${error.message}`);
      console.error(error);
    } else {
      toast.success(`Đã xóa công nhân ${worker.full_name}`);
      fetchWorkers();
    }
  };

  const handleQuickPrint = (worker: any) => {
    const loadingToast = toast.loading(`Đang chuẩn bị in hồ sơ của ${worker.full_name}...`);
    
    setTimeout(() => {
      toast.dismiss(loadingToast);
      toast.success('Chuẩn bị thành công! Đang mở hộp thoại in...');
      setTimeout(() => window.print(), 500); 
    }, 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-brand-blue">Quản Lý Công Nhân</h1>
        <div className="flex space-x-2">
          <a href="/Mau_Nhap_Cong_Nhan.xlsx" download>
            <Button variant="outline" className="text-green-700 border-green-300 hover:bg-green-50">
              <Download className="mr-2 h-4 w-4" /> Tải File Mẫu
            </Button>
          </a>
          <Button
            variant="outline"
            className="text-brand-blue border-brand-blue hover:bg-brand-blue/10"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" /> Import Excel
          </Button>
          <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> In thẻ hàng loạt</Button>
          <Link href="/workers/new">
            <Button className="bg-brand-blue hover:bg-brand-blue/90 text-white"><Plus className="mr-2 h-4 w-4" /> Thêm công nhân</Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input placeholder="Tìm kiếm theo Tên, MNV, CCCD..." className="pl-8" />
        </div>
      </div>

      <div className="border border-gray-200 rounded-md bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50 border-b border-gray-200">
            <TableRow>
              <TableHead className="text-brand-blue font-semibold">Ảnh</TableHead>
              <TableHead className="text-brand-blue font-semibold">MNV</TableHead>
              <TableHead className="text-brand-blue font-semibold">Họ Tên</TableHead>
              <TableHead className="text-brand-blue font-semibold">CCCD</TableHead>
              <TableHead className="text-brand-blue font-semibold">Tổ Đội</TableHead>
              <TableHead className="text-brand-blue font-semibold">Khu Vực</TableHead>
              <TableHead className="text-brand-blue font-semibold">Hồ Sơ</TableHead>
              <TableHead className="text-brand-blue font-semibold">Hành Động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-500">Đang tải dữ liệu...</TableCell>
              </TableRow>
            ) : workers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-500">Chưa có dữ liệu công nhân.</TableCell>
              </TableRow>
            ) : (
              workers.map((worker) => (
                <TableRow key={worker.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center border border-gray-300">
                      {worker.portrait_url ? (
                        <img src={worker.portrait_url} alt={worker.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400 text-[10px]">Ảnh</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{worker.mnv}</TableCell>
                  <TableCell>{worker.full_name}</TableCell>
                  <TableCell>{worker.cccd}</TableCell>
                  <TableCell>{worker.team}</TableCell>
                  <TableCell>{worker.area}</TableCell>
                  <TableCell>
                    {worker.drive_link ? (
                      <a href={worker.drive_link} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="text-brand-blue hover:text-brand-blue/80 hover:bg-brand-blue/10 p-0 h-auto font-normal">
                          <ExternalLink className="mr-1 h-3 w-3" /> Drive
                        </Button>
                      </a>
                    ) : (
                      <span className="text-gray-400 italic text-sm">Trống</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" title="In Nhanh Hồ Sơ" onClick={() => handleQuickPrint(worker)} className="hover:bg-brand-blue hover:text-white transition-colors">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Link href={`/workers/${worker.id}/edit`}>
                        <Button variant="outline" size="sm" title="Sửa" className="text-brand-blue border-brand-blue/30 hover:bg-brand-blue hover:text-white transition-colors">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" title="Xóa" onClick={() => handleDelete(worker)} className="text-brand-red border-brand-red/30 hover:bg-brand-red hover:text-white transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
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
