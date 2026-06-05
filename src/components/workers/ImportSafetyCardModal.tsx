'use client';

import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { importSafetyCardsAction, type SafetyCardImportRow } from '@/app/actions/worker';
import type { ImportResult } from '@/app/actions/worker';

// Mapping header Excel → field name
const HEADER_MAP: Record<string, keyof SafetyCardImportRow> = {
  'số cccd (*)':               'cccd',
  'số cccd':                  'cccd',
  'cccd':                     'cccd',
  'cccd (*)':                 'cccd',
  'số thẻ':                   'safety_card_number',
  'số thẻ atlđ':              'safety_card_number',
  'ngày cấp':                 'safety_card_date',
  'ngày cấp thẻ':             'safety_card_date',
  'trạng thái':               'card_status_text',
  'trạng thái thẻ':           'card_status_text',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Step = 'upload' | 'preview' | 'result';

export default function ImportSafetyCardModal({ open, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<SafetyCardImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setRows([]);
    setFileName('');
    setResult(null);
    setShowErrors(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseExcel = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Chỉ hỗ trợ file .xlsx, .xls hoặc .csv');
      return;
    }
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (raw.length < 2) {
          toast.error('File không có dữ liệu. Vui lòng kiểm tra lại.');
          return;
        }

        let headerRowIndex = 0;
        let headerRow: string[] = [];
        let maxMatchCount = 0;

        for (let i = 0; i < Math.min(raw.length, 5); i++) {
          const rowStrings = (raw[i] as string[]).map(h => String(h || '').trim().toLowerCase());
          let matchCount = 0;
          rowStrings.forEach(h => {
            if (HEADER_MAP[h]) matchCount++;
          });
          if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount;
            headerRowIndex = i;
            headerRow = rowStrings;
          }
        }

        if (maxMatchCount === 0) {
          toast.error('Không tìm thấy cột CCCD hợp lệ. Vui lòng đảm bảo file có cột "Số CCCD".');
          return;
        }

        const parsed: SafetyCardImportRow[] = [];

        for (let i = headerRowIndex + 1; i < raw.length; i++) {
          const cells = raw[i] as string[];
          if (!cells || cells.every(c => !String(c).trim())) continue;

          const obj: any = {};
          headerRow.forEach((h, ci) => {
            const field = HEADER_MAP[h];
            if (field) obj[field] = String(cells[ci] ?? '').trim();
          });

          // Chỉ thêm nếu có cccd
          const cccdVal = obj.cccd?.trim() || '';
          if (cccdVal && cccdVal.length > 5) {
            parsed.push(obj as SafetyCardImportRow);
          }
        }

        if (parsed.length === 0) {
          toast.error('Không tìm thấy dữ liệu hợp lệ.');
          return;
        }

        setRows(parsed);
        setStep('preview');
      } catch (err) {
        toast.error('Không thể đọc file. File có thể bị lỗi.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseExcel(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcel(file);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await importSafetyCardsAction(rows);
      setResult(res);
      setStep('result');
      if (res.success > 0) onImported();
    } catch (err: any) {
      toast.error('Lỗi khi import: ' + (err?.message || 'Không xác định'));
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,31,92,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#1e3a8a,#970731)' }}>
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Cập Nhật Thẻ ATLĐ Hàng Loạt</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Dựa trên cột Số CCCD để cập nhật thông tin thẻ
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-gray-100">
          {(['upload', 'preview', 'result'] as Step[]).map((s, i) => (
            <div key={s} className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${step === s ? 'text-blue-700 border-b-2 border-blue-600' : 'text-gray-400'}`}>
              {i + 1}. {s === 'upload' ? 'Chọn file' : s === 'preview' ? 'Xem trước' : 'Kết quả'}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onClick={() => inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-2xl border-2 cursor-pointer transition-all duration-200
                  ${isDragging
                    ? 'border-blue-400 bg-blue-50 scale-[1.01]'
                    : 'border-dashed border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40'}`}
              >
                <div className={`p-4 rounded-2xl transition-colors ${isDragging ? 'bg-blue-100' : 'bg-white shadow-sm'}`}>
                  <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">
                    {isDragging ? 'Thả file vào đây...' : 'Kéo thả file Excel chứa danh sách thẻ'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Yêu cầu phải có cột &quot;Số CCCD&quot;</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <p className="text-xs text-gray-400 text-center">
                💡 Cột hỗ trợ: <strong>Số CCCD, Số Thẻ, Ngày cấp, Trạng thái</strong> (Đang chờ cấp / Đã đào tạo / Đã cấp)
              </p>
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <FileSpreadsheet className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-800 truncate">{fileName}</p>
                  <p className="text-xs text-blue-600">{rows.length} bản ghi sẽ được cập nhật</p>
                </div>
                <button onClick={resetState} className="text-xs text-blue-500 hover:text-blue-700 underline shrink-0">Đổi file</button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 font-semibold border-b border-gray-200">#</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-semibold border-b border-gray-200">Số CCCD</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-semibold border-b border-gray-200">Số Thẻ</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-semibold border-b border-gray-200">Ngày Cấp</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-semibold border-b border-gray-200">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{i + 2}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{r.cccd}</td>
                          <td className="px-3 py-2 text-gray-600">{r.safety_card_number || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{r.safety_card_date || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{r.card_status_text || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Result ── */}
          {step === 'result' && result && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
                  <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-green-700">{result.success}</p>
                    <p className="text-xs text-green-600">Thành công</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                  <AlertCircle className="w-8 h-8 text-red-400 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                    <p className="text-xs text-red-500">Thất bại</p>
                  </div>
                </div>
              </div>

              {/* Error details */}
              {result.errors.length > 0 && (
                <div className="border border-red-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowErrors(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-semibold text-red-700">{result.errors.length} lỗi cần xem xét</span>
                    </div>
                    {showErrors ? <ChevronUp className="w-4 h-4 text-red-400" /> : <ChevronDown className="w-4 h-4 text-red-400" />}
                  </button>
                  {showErrors && (
                    <div className="divide-y divide-red-50 max-h-48 overflow-y-auto">
                      {result.errors.map((e, i) => (
                        <div key={i} className="px-4 py-2.5 flex items-start gap-2">
                          <span className="text-xs text-red-400 font-mono shrink-0">Dòng {e.row}</span>
                          <div>
                            <p className="text-xs font-medium text-gray-700">{e.name}</p>
                            <p className="text-xs text-red-500">{e.reason}</p>
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

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={step === 'upload' ? handleClose : step === 'preview' ? resetState : handleClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 border-2 border-gray-200 hover:border-gray-300 hover:bg-white transition-all"
          >
            {step === 'preview' ? 'Quay lại' : 'Đóng'}
          </button>

          {step === 'preview' && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: importing ? '#6b7280' : 'linear-gradient(135deg,#1e3a8a,#970731)', boxShadow: importing ? 'none' : '0 4px 14px rgba(30,58,138,0.3)' }}
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang cập nhật...</>
              ) : (
                <><Upload className="w-4 h-4" /> Cập nhật {rows.length} bản ghi</>
              )}
            </button>
          )}

          {step === 'result' && result && result.failed > 0 && (
            <button
              onClick={resetState}
              className="px-4 py-2 rounded-xl text-sm font-medium text-blue-700 border-2 border-blue-200 hover:bg-blue-50 transition-all"
            >
              Import lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
