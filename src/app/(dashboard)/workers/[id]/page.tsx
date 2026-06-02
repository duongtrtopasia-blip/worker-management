'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Edit, User } from 'lucide-react';
import Link from 'next/link';

export default function WorkerDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-blue-900">Chi Tiết Hồ Sơ Công Nhân</h1>
        <Link href={`/workers/${params.id}/edit`}>
          <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Sửa thông tin</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Thông tin chung */}
        <div className="lg:col-span-1 bg-white p-6 border rounded-md shadow-sm space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-40 h-52 bg-gray-100 border rounded-md flex items-center justify-center overflow-hidden">
              <User className="w-16 h-16 text-gray-400" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Nguyễn Văn A</h2>
              <p className="text-gray-500">MNV: NV-001</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Tổ đội:</span>
              <span className="font-medium">Tổ thi công 1</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Khu vực:</span>
              <span className="font-medium">Khu A</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">CCCD:</span>
              <span className="font-medium">012345678910</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-gray-500">Trạng thái:</span>
              <span className="font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Đang hoạt động</span>
            </div>
          </div>
        </div>

        {/* Cột phải: Tabs */}
        <div className="lg:col-span-2 bg-white p-6 border rounded-md shadow-sm">
          <Tabs defaultValue="cards" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cards">Thẻ Ra Vào</TabsTrigger>
              <TabsTrigger value="documents">Hồ Sơ Tài Liệu</TabsTrigger>
              <TabsTrigger value="history">Lịch Sử</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cards" className="p-4 mt-2 border rounded-md min-h-[300px]">
              <h3 className="font-semibold mb-4">Danh sách thẻ ra vào</h3>
              <p className="text-sm text-gray-500">Nội dung thẻ ra vào sẽ được tích hợp từ Prompt 5.</p>
            </TabsContent>
            
            <TabsContent value="documents" className="p-4 mt-2 border rounded-md min-h-[300px]">
              <h3 className="font-semibold mb-4">Tình trạng hồ sơ (5 loại tài liệu)</h3>
              <p className="text-sm text-gray-500">Nội dung hồ sơ sẽ được tích hợp từ Prompt 6.</p>
            </TabsContent>
            
            <TabsContent value="history" className="p-4 mt-2 border rounded-md min-h-[300px]">
              <h3 className="font-semibold mb-4">Lịch sử thay đổi</h3>
              <p className="text-sm text-gray-500">Hiển thị audit logs ở đây.</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
