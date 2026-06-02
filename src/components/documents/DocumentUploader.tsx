'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, ExternalLink, X, Calendar, RefreshCw } from 'lucide-react';
import { DocumentType } from '@/types';
import toast from 'react-hot-toast';

interface DocumentUploaderProps {
  workerId: string;
  docType: DocumentType;
  existingDocUrl?: string;
  existingIssueDate?: string;
  label?: string;
  note?: string;
  icon?: React.ElementType;
  hasDoc?: boolean;
  onSuccess: () => void | Promise<void>;
}

export const DocumentUploader = ({
  workerId, docType, existingDocUrl, existingIssueDate,
  label, note, icon: DocIcon, hasDoc = false, onSuccess
}: DocumentUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState(existingIssueDate || '');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf') { toast.error('Chỉ chấp nhận file PDF'); return; }
      if (selected.size > 20 * 1024 * 1024) { toast.error('File không được vượt quá 20MB'); return; }
      setFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (dropped.type !== 'application/pdf') { toast.error('Chỉ chấp nhận file PDF'); return; }
    setFile(dropped);
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
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload thất bại');
      toast.success(`Đã tải lên ${label || docType} thành công!`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess();
    } catch {
      toast.error('Có lỗi xảy ra khi tải lên');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
      hasDoc
        ? 'border-green-200 bg-green-50/30'
        : 'border-gray-100 bg-white hover:border-gray-200'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center gap-3 border-b ${hasDoc ? 'border-green-200/60 bg-green-50/50' : 'border-gray-100 bg-gray-50/50'}`}>
        <div className={`p-1.5 rounded-lg ${hasDoc ? 'bg-green-100' : 'bg-gray-100'}`}>
          {DocIcon ? (
            <DocIcon className={`w-4 h-4 ${hasDoc ? 'text-green-600' : 'text-gray-500'}`} />
          ) : (
            <FileText className={`w-4 h-4 ${hasDoc ? 'text-green-600' : 'text-gray-500'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${hasDoc ? 'text-green-800' : 'text-gray-800'}`}>
            {label || docType}
          </p>
          {note && <p className="text-[11px] text-gray-400 truncate">{note}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasDoc ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
              <CheckCircle2 className="w-3 h-3" /> Đã có
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <AlertCircle className="w-3 h-3" /> Chưa có
            </span>
          )}
          {existingDocUrl && (
            <a
              href={existingDocUrl} target="_blank" rel="noreferrer"
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-white transition-colors"
              title="Xem file"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Date fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <Calendar className="w-3 h-3" /> Ngày cấp
            </label>
            <input
              type="date" value={issueDate}
              onChange={e => setIssueDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border-2 border-gray-100 bg-gray-50 text-gray-800 text-xs
                focus:outline-none focus:border-brand-blue/40 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <Calendar className="w-3 h-3" /> Hết hạn (nếu có)
            </label>
            <input
              type="date" value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border-2 border-gray-100 bg-gray-50 text-gray-800 text-xs
                focus:outline-none focus:border-brand-blue/40 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* File drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            isDragging
              ? 'border-brand-blue bg-brand-blue/5'
              : file
                ? 'border-green-300 bg-green-50/50'
                : 'border-gray-200 bg-gray-50/50 hover:border-brand-blue/30 hover:bg-blue-50/20'
          }`}
        >
          <input
            type="file" accept=".pdf" className="hidden"
            ref={fileInputRef} onChange={handleFileChange}
          />
          {file ? (
            <>
              <div className="p-2 rounded-lg bg-green-100">
                <FileText className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{file.name}</p>
                <p className="text-[11px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <div className={`p-2 rounded-lg transition-colors ${isDragging ? 'bg-brand-blue/10' : 'bg-gray-100'}`}>
                <Upload className={`w-4 h-4 transition-colors ${isDragging ? 'text-brand-blue' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600">
                  {isDragging ? (
                    <span className="font-semibold text-brand-blue">Thả file vào đây</span>
                  ) : (
                    <><span className="font-medium text-brand-blue">Click để chọn</span> hoặc kéo thả file</>
                  )}
                </p>
                <p className="text-[11px] text-gray-400">PDF · Tối đa 20MB</p>
              </div>
            </>
          )}
        </div>

        {/* Upload button */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`w-full h-10 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
            ${!file || uploading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'text-white hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
            }`}
          style={file && !uploading ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #970731 100%)' } : {}}
        >
          {uploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Đang tải lên...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {hasDoc ? 'Cập nhật tài liệu' : 'Tải lên tài liệu'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
