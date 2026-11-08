'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download, Image as ImageIcon, CheckSquare, XCircle } from 'lucide-react';
import { parseWorkersExcel, ParseResult } from '@/lib/excel-parser';
import toast from 'react-hot-toast';
import { uploadBulkImagesAction } from '@/app/actions/worker';

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<'excel' | 'images'>('excel');

  // Excel state
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Images state
  const [images, setImages] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageResults, setImageResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      
      try {
        const result = await parseWorkersExcel(selected);
        setParseResult(result);
      } catch (error) {
        toast.error('File không hợp lệ hoặc bị lỗi');
        setParseResult(null);
      }
    }
  };

  const handleImportExcel = async () => {
    if (!parseResult || parseResult.validWorkers.length === 0) return;
    setIsImporting(true);

    try {
      const chunkSize = 50;
      const workers = parseResult.validWorkers;
      
      for (let i = 0; i < workers.length; i += chunkSize) {
        const chunk = workers.slice(i, i + chunkSize);
        
        const res = await fetch('/api/import/workers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workers: chunk })
        });
        
        if (!res.ok) throw new Error('Có lỗi xảy ra khi gọi API');
      }

      toast.success('Import Excel hoàn tất!');
      setFile(null);
      setParseResult(null);
    } catch (error: any) {
      toast.error(error.message || 'Lỗi không xác định');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
      setImageResults(null);
    }
  };

  const handleUploadImages = async () => {
    if (images.length === 0) return;
    setIsUploadingImages(true);
    setImageResults(null);

    try {
      const formData = new FormData();
      images.forEach(img => formData.append('images', img));

      const results = await uploadBulkImagesAction(formData);
      setImageResults(results);
      
      if (results.failed === 0) {
        toast.success(`Đã upload thành công ${results.success} ảnh!`);
        setImages([]);
      } else {
        toast.error(`Có lỗi xảy ra với ${results.failed} ảnh.`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Lỗi hệ thống');
    } finally {
      setIsUploadingImages(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[10px] bg-[#1e3a8a]">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-[#0f1b33] tracking-[-0.02em]">Nhập dữ liệu hàng loạt</h1>
            <p className="text-[13px] text-[#5b6577] mt-0.5">Thêm hàng loạt công nhân từ Excel hoặc cập nhật ảnh chân dung 3x4</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/Mau_Nhap_Cong_Nhan.xlsx" download className="btn-secondary">
            <Download className="h-4 w-4 text-[#047857]" /> Tải File Mẫu Excel
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e3e8ef]">
        <button
          onClick={() => setActiveTab('excel')}
          className={`px-5 py-3 text-[13px] font-bold border-b-2 transition-all ${
            activeTab === 'excel' 
              ? 'border-[#1e3a8a] text-[#1e3a8a]' 
              : 'border-transparent text-[#5b6577] hover:text-[#0f1b33] hover:border-[#8592a4]'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Import Excel
          </div>
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`px-5 py-3 text-[13px] font-bold border-b-2 transition-all ${
            activeTab === 'images' 
              ? 'border-[#1e3a8a] text-[#1e3a8a]' 
              : 'border-transparent text-[#5b6577] hover:text-[#0f1b33] hover:border-[#8592a4]'
          }`}
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Upload Ảnh Hàng Loạt
          </div>
        </button>
      </div>

      <div className="bg-white p-6 border border-[#e3e8ef] rounded-[12px] shadow-[0_1px_2px_rgba(15,27,51,0.04)] space-y-6">
        
        {/* ===================== TAB EXCEL ===================== */}
        {activeTab === 'excel' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-2 border-dashed border-[#8592a4] hover:border-[#1e3a8a] rounded-[12px] p-12 flex flex-col items-center justify-center bg-[#f7f9fc] hover:bg-[#eef2fb]/40 transition-colors text-center cursor-pointer relative">
              <FileSpreadsheet className="w-12 h-12 text-[#1e3a8a] mb-4" />
              <p className="text-sm font-bold text-[#0f1b33] mb-1">Kéo thả file Excel (.xlsx) vào đây</p>
              <p className="text-xs text-[#5b6577] mb-4">Hoặc click để chọn từ thiết bị</p>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              <span className="btn-secondary pointer-events-none">
                Chọn Tệp Excel
              </span>
            </div>

            {parseResult && (
              <div className="space-y-4 pt-4 border-t border-[#e3e8ef]">
                <h3 className="font-extrabold text-[#0f1b33] text-base">Báo cáo kiểm tra dữ liệu</h3>
                <div className="flex gap-4">
                  <div className="flex-1 bg-[#ecfdf5] text-[#047857] p-5 rounded-[12px] border border-[#a7f3d0] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">Hợp lệ</p>
                      <p className="text-3xl font-extrabold mt-1">{parseResult.validWorkers.length} <span className="text-base font-medium">dòng</span></p>
                    </div>
                    <CheckCircle2 className="w-10 h-10 text-[#10b981] opacity-60" />
                  </div>
                  <div className="flex-1 bg-[#fef2f2] text-[#b4141a] p-5 rounded-[12px] border border-[#f5b5b8] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">Lỗi</p>
                      <p className="text-3xl font-extrabold mt-1">{parseResult.errors.length} <span className="text-base font-medium">dòng</span></p>
                    </div>
                    <AlertTriangle className="w-10 h-10 text-[#e31c23] opacity-60" />
                  </div>
                </div>

                {parseResult.errors.length > 0 && (
                  <div className="bg-[#fef7e6] p-4 border border-[#f5d89a] rounded-[12px] max-h-60 overflow-auto mt-4">
                    <h4 className="font-bold text-[#92400e] flex items-center mb-2 text-sm">
                      <AlertTriangle className="w-4 h-4 mr-2" /> Chi tiết lỗi
                    </h4>
                    <ul className="text-sm text-[#92400e] space-y-1.5 list-disc pl-5">
                      {parseResult.errors.map((err, i) => (
                        <li key={i}><span className="font-bold">Dòng {err.row}:</span> {err.errors.join(', ')}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleImportExcel} 
                    disabled={parseResult.validWorkers.length === 0 || isImporting}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImporting ? 'Đang xử lý...' : `Tiến Hành Import (${parseResult.validWorkers.length})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB IMAGES ===================== */}
        {activeTab === 'images' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-[#eef2fb] border border-[#c9d4f0] rounded-[12px] p-4 flex gap-3 text-sm text-[#1e3a8a]">
              <AlertTriangle className="w-5 h-5 shrink-0 text-[#1e3a8a]" />
              <div className="space-y-1">
                <p className="font-bold">Hướng dẫn đổi tên file ảnh</p>
                <p>Hệ thống tự động nối ảnh với công nhân dựa vào số CCCD. Bạn phải đổi tên file ảnh thành <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#c9d4f0]">số_cccd.jpg</strong> hoặc <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#c9d4f0]">số_cccd.png</strong> trước khi tải lên (VD: <strong className="font-mono">001098001416.jpg</strong>).</p>
              </div>
            </div>

            <div className="border-2 border-dashed border-[#8592a4] hover:border-[#1e3a8a] rounded-[12px] p-12 flex flex-col items-center justify-center bg-[#f7f9fc] hover:bg-[#eef2fb]/40 transition-colors text-center cursor-pointer relative">
              <ImageIcon className="w-12 h-12 text-[#1e3a8a] mb-4" />
              <p className="text-sm font-bold text-[#0f1b33] mb-1">Chọn hàng loạt ảnh chân dung</p>
              <p className="text-xs text-[#5b6577] mb-4">Hỗ trợ JPG, PNG (Chọn nhiều file cùng lúc)</p>
              <input 
                type="file" 
                accept="image/*"
                multiple 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleImageChange}
              />
              <span className="btn-secondary pointer-events-none">
                Chọn File Ảnh
              </span>
            </div>

            {images.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-[#e3e8ef]">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-[#0f1b33] text-base">Đã chọn {images.length} ảnh</h3>
                  <button 
                    onClick={handleUploadImages} 
                    disabled={isUploadingImages}
                    className="btn-primary disabled:opacity-50"
                  >
                    {isUploadingImages ? (
                      <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang tải lên...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Upload {images.length} ảnh</span>
                    )}
                  </button>
                </div>

                {imageResults && (
                  <div className="mt-6 space-y-4 bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <h3 className="font-semibold text-gray-800">Kết quả Upload</h3>
                    <div className="flex gap-4">
                      <div className="flex-1 bg-white border border-emerald-100 rounded-lg p-3 flex items-center gap-3">
                        <CheckSquare className="w-8 h-8 text-emerald-500" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Thành công</p>
                          <p className="text-2xl font-bold text-emerald-700">{imageResults.success}</p>
                        </div>
                      </div>
                      <div className="flex-1 bg-white border border-red-100 rounded-lg p-3 flex items-center gap-3">
                        <XCircle className="w-8 h-8 text-red-500" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Thất bại</p>
                          <p className="text-2xl font-bold text-red-700">{imageResults.failed}</p>
                        </div>
                      </div>
                    </div>
                    
                    {imageResults.errors.length > 0 && (
                      <div className="bg-red-50 p-4 border border-red-100 rounded-lg max-h-48 overflow-auto">
                        <h4 className="font-semibold text-red-800 text-sm mb-2">Chi tiết lỗi:</h4>
                        <ul className="text-xs text-red-700 space-y-1 list-disc pl-5">
                          {imageResults.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Image Preview Grid */}
                {!imageResults && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
                    {images.map((file, idx) => (
                      <div key={idx} className="aspect-square bg-white rounded-lg border border-gray-200 overflow-hidden relative group">
                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={file.name} />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1">
                          <p className="text-[10px] text-white truncate text-center">{file.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
