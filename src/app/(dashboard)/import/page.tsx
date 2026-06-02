'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { parseWorkersExcel, ParseResult } from '@/lib/excel-parser';
import toast from 'react-hot-toast';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      
      try {
        const result = await parseWorkersExcel(selected);
        setParseResult(result);
      } catch (error) {
        toast.error('File không hợp lệ hoặc lỗi parse');
        setParseResult(null);
      }
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.validWorkers.length === 0) return;
    setIsImporting(true);

    try {
      // Chunk array to size 50 for batching
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
        
        // Progress update...
      }

      toast.success('Import hoàn tất!');
      setFile(null);
      setParseResult(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-blue-900">Import Excel Công Nhân</h1>

      <div className="bg-white p-6 border rounded-md shadow-sm space-y-6">
        {/* Step 1: Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center justify-center bg-gray-50 text-center">
          <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-2">Kéo thả file Excel (.xlsx) vào đây hoặc click để chọn file</p>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="block w-full max-w-xs text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            onChange={handleFileChange}
          />
        </div>

        {/* Step 2: Preview & Report */}
        {parseResult && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Báo cáo kiểm tra dữ liệu</h3>
            <div className="flex gap-4">
              <div className="flex-1 bg-green-50 text-green-700 p-4 rounded-md border border-green-200">
                <p className="text-sm font-semibold">Hợp lệ</p>
                <p className="text-2xl font-bold">{parseResult.validWorkers.length} dòng</p>
              </div>
              <div className="flex-1 bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
                <p className="text-sm font-semibold">Có lỗi</p>
                <p className="text-2xl font-bold">{parseResult.errors.length} dòng</p>
              </div>
            </div>

            {parseResult.errors.length > 0 && (
              <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-md max-h-60 overflow-auto">
                <h4 className="font-semibold text-yellow-800 flex items-center mb-2">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Chi tiết lỗi
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc pl-5">
                  {parseResult.errors.map((err, i) => (
                    <li key={i}>Dòng {err.row}: {err.errors.join(', ')}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleImport} 
                disabled={parseResult.validWorkers.length === 0 || isImporting}
                className="bg-blue-600"
              >
                {isImporting ? 'Đang Import...' : `Import ${parseResult.validWorkers.length} công nhân hợp lệ`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
