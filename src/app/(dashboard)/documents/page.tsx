import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-blue-900">Tình Trạng Hồ Sơ</h1>
        <div className="flex space-x-2">
          <Button variant="outline" className="text-green-700 border-green-600 hover:bg-green-50">
            <Download className="mr-2 h-4 w-4" /> Xuất Excel Thiếu Hồ Sơ
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input placeholder="Tìm kiếm công nhân..." className="pl-8" />
        </div>
        {/* Dropdowns for filter will go here */}
      </div>

      <div className="border rounded-md bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Ảnh</TableHead>
              <TableHead>Họ Tên / MNV</TableHead>
              <TableHead>Tổ Đội</TableHead>
              <TableHead className="text-center">Sức Khỏe</TableHead>
              <TableHead className="text-center">CCCD</TableHead>
              <TableHead className="text-center">Thẻ ATLĐ</TableHead>
              <TableHead className="text-center">Kiểm Tra</TableHead>
              <TableHead className="text-center">Cam Kết</TableHead>
              <TableHead className="text-center">Tổng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Dữ liệu mẫu hiển thị trạng thái */}
            <TableRow>
              <TableCell>
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
              </TableCell>
              <TableCell>
                <p className="font-semibold text-sm">Nguyễn Văn A</p>
                <p className="text-xs text-gray-500">NV-001</p>
              </TableCell>
              <TableCell className="text-sm">Tổ 1</TableCell>
              
              <TableCell className="text-center">
                <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto" title="Sắp hết hạn" />
              </TableCell>
              <TableCell className="text-center">
                <XCircle className="w-5 h-5 text-red-500 mx-auto" title="Thiếu" />
              </TableCell>
              <TableCell className="text-center">
                <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
              </TableCell>
              
              <TableCell>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '80%' }}></div>
                </div>
                <p className="text-xs text-center mt-1 text-gray-500">4/5</p>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-4 text-sm text-gray-600 bg-white p-4 border rounded-md">
        <div className="flex items-center"><CheckCircle2 className="w-4 h-4 text-green-500 mr-2"/> Đã có / Còn hạn</div>
        <div className="flex items-center"><AlertTriangle className="w-4 h-4 text-yellow-500 mr-2"/> Sắp hết hạn (≤ 30 ngày)</div>
        <div className="flex items-center"><XCircle className="w-4 h-4 text-red-500 mr-2"/> Chưa có / Hết hạn</div>
      </div>
    </div>
  );
}
