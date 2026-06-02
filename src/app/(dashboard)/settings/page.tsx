'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Database, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { backupDatabaseAction } from '@/app/actions/backup';

export default function SettingsPage() {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    const toastId = toast.loading('Đang trích xuất dữ liệu...');
    
    try {
      const res = await backupDatabaseAction();
      
      if (res.success && res.data) {
        // Tạo một Blob từ chuỗi JSON
        const blob = new Blob([res.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Tạo thẻ a ẩn để trigger tải về
        const a = document.createElement('a');
        a.href = url;
        
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `vincons_backup_${dateStr}_${Date.now()}.json`;
        
        document.body.appendChild(a);
        a.click();
        
        // Dọn dẹp
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success('Đã tải bản sao lưu xuống máy tính!', { id: toastId });
      } else {
        toast.error(res.error || 'Có lỗi xảy ra khi backup', { id: toastId });
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi kết nối máy chủ', { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center space-x-2 border-b pb-4 mb-6">
        <Settings className="w-8 h-8 text-brand-blue" />
        <h1 className="text-2xl font-bold text-gray-900">Cài Đặt Hệ Thống</h1>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center mb-2">
            <Database className="w-5 h-5 mr-2 text-blue-600" />
            Sao lưu dữ liệu (Backup Local)
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Tính năng này sẽ trích xuất toàn bộ dữ liệu từ Cơ sở dữ liệu hiện tại (bao gồm cả bảng công nhân và danh sách thẻ) 
            sang định dạng JSON, sau đó tải file trực tiếp xuống máy tính của bạn để lưu trữ an toàn.
          </p>
          
          <Button 
            onClick={handleBackup} 
            disabled={isBackingUp}
            className="bg-brand-blue hover:bg-brand-blue/90 flex items-center"
          >
            {isBackingUp ? 'Đang xuất dữ liệu...' : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Tải xuống bản sao lưu
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
