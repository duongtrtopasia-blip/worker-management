'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { DocumentType } from '@/types';
import toast from 'react-hot-toast';

interface DocumentUploaderProps {
  workerId: string;
  docType: DocumentType;
  existingDocUrl?: string;
  onSuccess: () => void;
}

export const DocumentUploader = ({ workerId, docType, existingDocUrl, onSuccess }: DocumentUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf') {
        toast.error('Chỉ chấp nhận file PDF');
        return;
      }
      if (selected.size > 20 * 1024 * 1024) {
        toast.error('File không được vượt quá 20MB');
        return;
      }
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('workerId', workerId);
    formData.append('docType', docType);
    if (issueDate) formData.append('issueDate', issueDate);
    if (expiryDate) formData.append('expiryDate', expiryDate);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload thất bại');

      toast.success('Upload tài liệu thành công');
      setFile(null);
      onSuccess();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border rounded-md p-4 space-y-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-700 capitalize">{docType.replace('_', ' ')}</h4>
        {existingDocUrl && (
          <a href={existingDocUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline flex items-center">
            <FileText className="w-4 h-4 mr-1" /> Xem file hiện tại
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Ngày cấp</Label>
          <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Ngày hết hạn (Nếu có)</Label>
          <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Input type="file" accept=".pdf" onChange={handleFileChange} className="text-sm cursor-pointer file:cursor-pointer" />
        <Button onClick={handleUpload} disabled={!file || uploading} size="sm" className="whitespace-nowrap">
          {uploading ? 'Đang tải...' : <><Upload className="w-4 h-4 mr-2" /> Upload</>}
        </Button>
      </div>
    </div>
  );
};
