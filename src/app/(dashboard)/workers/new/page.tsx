'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { addWorkerAction } from '@/app/actions/worker';
import { supabase } from '@/lib/supabase';
import { invalidateDataCache } from '@/lib/data-cache';
import { formatVehiclePlate } from '@/lib/format-vehicle';
import {
  User, Hash, CreditCard, Users, MapPin, Briefcase, Phone, Calendar,
  Car, FileText, Camera, Upload, ChevronLeft, Save, X, CheckCircle2,
  AlertTriangle, Search, ArrowRight, Loader2, Shield, Sparkles
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Shared input styles (SCMP Vincons Design System)
───────────────────────────────────────────────────────────── */
const inputBase =
  'w-full h-10 px-3.5 rounded-lg border border-[#8592a4] bg-white text-[#0f1b33] text-sm ' +
  'placeholder:text-[#6b7586] transition-all duration-150 ' +
  'focus:outline-none focus:border-[#1e3a8a] focus:shadow-[0_0_0_3px_#c9d4f0] ' +
  'hover:border-[#5b6577]';

/* ─────────────────────────────────────────────────────────────
   Field Components
───────────────────────────────────────────────────────── */
function Field({
  id, name, label, placeholder, required, type = 'text',
  icon: Icon, maxLength, defaultValue, readOnly, onBlur,
}: {
  id: string; name: string; label: string; placeholder?: string;
  required?: boolean; type?: string; icon: React.ElementType; maxLength?: number;
  defaultValue?: string; readOnly?: boolean; onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-[13px] font-bold text-[#334155]">
        <Icon className="w-3.5 h-3.5 text-[#1e3a8a]" />
        {label}
        {required && <span className="text-[#b4141a] ml-0.5 font-bold">*</span>}
      </label>
      <input
        id={id} name={name} type={type}
        required={required} placeholder={placeholder}
        maxLength={maxLength} defaultValue={defaultValue}
        readOnly={readOnly} onBlur={onBlur}
        className={`${inputBase} ${readOnly ? '!bg-[#f7f9fc] !border-[#e3e8ef] cursor-not-allowed text-[#5b6577]' : ''}`}
      />
    </div>
  );
}

function SelectField({
  id, name, label, icon: Icon, children,
}: {
  id: string; name: string; label: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-[13px] font-bold text-[#334155]">
        <Icon className="w-3.5 h-3.5 text-[#1e3a8a]" />
        {label}
      </label>
      <select
        id={id} name={name}
        className={`${inputBase} cursor-pointer appearance-none`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%235b6577'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '16px',
        }}
      >
        {children}
      </select>
    </div>
  );
}

function Section({ number, title, subtitle, icon: Icon, children }: {
  number: number; title: string; subtitle: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e3e8ef] shadow-sm overflow-hidden">
      <div className="flex items-center gap-3.5 px-6 py-4 border-b border-[#e3e8ef] bg-[#f7f9fc]">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1e3a8a] text-white text-xs font-bold shrink-0">
          {number}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-[#0f1b33]">{title}</h3>
          <p className="text-xs text-[#5b6577] mt-0.5">{subtitle}</p>
        </div>
        <div className="p-2 rounded-lg bg-[#eef2fb]">
          <Icon className="w-4 h-4 text-[#1e3a8a]" />
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CCCD Check Panel (Left)
───────────────────────────────────────────────────────── */
function CccdCheckPanel({
  cccdToCheck, setCccdToCheck,
  checkStatus, setCheckStatus,
  isChecking, onCheck,
  foundWorkerId,
}: {
  cccdToCheck: string;
  setCccdToCheck: (v: string) => void;
  checkStatus: 'idle' | 'not_found' | 'found';
  setCheckStatus: (v: 'idle' | 'not_found' | 'found') => void;
  isChecking: boolean;
  onCheck: () => void;
  foundWorkerId: string | null;
}) {
  const router = useRouter();

  return (
    <aside className="w-full md:w-[340px] lg:w-[400px] shrink-0 bg-white border-r border-[#e3e8ef] flex flex-col overflow-y-auto">
      {/* Panel Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[#e3e8ef] bg-[#f7f9fc]">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-1.5 rounded-[8px] bg-[#1e3a8a]">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-extrabold text-[#0f1b33]">Kiểm tra CCCD</h2>
        </div>
        <p className="text-xs text-[#5b6577] ml-8">Bước bắt buộc trước khi tạo hồ sơ</p>
      </div>

      {/* Steps indicator */}
      <div className="px-6 py-5 flex flex-col gap-3">
        {/* Step 1 */}
        <div className={`flex items-center gap-3 p-3 rounded-[10px] transition-all ${
          checkStatus === 'idle' ? 'bg-[#eef2fb] border border-[#c9d4f0]' : 'bg-[#f7f9fc] border border-[#e3e8ef] opacity-60'
        }`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
            checkStatus !== 'idle' ? 'bg-[#10b981] text-white' : 'bg-[#1e3a8a] text-white'
          }`}>
            {checkStatus !== 'idle' ? <CheckCircle2 className="w-4 h-4" /> : '1'}
          </div>
          <div>
            <p className="text-xs font-bold text-[#0f1b33]">Nhập số CCCD/CMND</p>
            <p className="text-[11px] text-[#5b6577] mt-0.5">Bắt buộc — 9 hoặc 12 chữ số</p>
          </div>
        </div>

        {/* Connector */}
        <div className="w-px h-4 bg-[#e3e8ef] ml-5" />

        {/* Step 2 */}
        <div className={`flex items-center gap-3 p-3 rounded-[10px] transition-all ${
          checkStatus === 'not_found' ? 'bg-[#ecfdf5] border border-[#a7f3d0]' :
          checkStatus === 'found' ? 'bg-[#fef7e6] border border-[#f5d89a]' :
          'bg-[#f7f9fc] border border-[#e3e8ef] opacity-40'
        }`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
            checkStatus === 'not_found' ? 'bg-[#10b981] text-white' :
            checkStatus === 'found' ? 'bg-[#d97706] text-white' :
            'bg-[#8592a4] text-white'
          }`}>
            {checkStatus === 'not_found' ? <CheckCircle2 className="w-4 h-4" /> :
             checkStatus === 'found' ? <AlertTriangle className="w-4 h-4" /> : '2'}
          </div>
          <div>
            <p className="text-xs font-bold text-[#0f1b33]">Kết quả kiểm tra</p>
            <p className="text-[11px] text-[#5b6577] mt-0.5">
              {checkStatus === 'not_found' ? 'CCCD hợp lệ, có thể thêm mới' :
               checkStatus === 'found' ? 'Đã tồn tại trong hệ thống' :
               'Chờ kiểm tra...'}
            </p>
          </div>
        </div>

        {/* Connector */}
        <div className="w-px h-4 bg-[#e3e8ef] ml-5" />

        {/* Step 3 */}
        <div className={`flex items-center gap-3 p-3 rounded-[10px] transition-all ${
          checkStatus === 'not_found' ? 'bg-[#eef2fb] border border-[#c9d4f0]' : 'bg-[#f7f9fc] border border-[#e3e8ef] opacity-40'
        }`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
            checkStatus === 'not_found' ? 'bg-[#1e3a8a] text-white' : 'bg-[#8592a4] text-white'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#0f1b33]">Điền hồ sơ & lưu</p>
            <p className="text-[11px] text-[#5b6577] mt-0.5">Thông tin cá nhân, công việc, xe</p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="px-6 pb-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-[#5b6577] uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <CreditCard className="w-3.5 h-3.5 text-[#1e3a8a]" />
            Số CCCD / CMND <span className="text-[#e31c23]">*</span>
          </label>
          <div className="flex gap-2">
            <input
              value={cccdToCheck}
              onChange={e => { setCccdToCheck(e.target.value); setCheckStatus('idle'); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onCheck(); } }}
              placeholder="012 345 678 910"
              maxLength={12}
              className={`${inputBase} flex-1`}
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={onCheck}
            disabled={isChecking || !cccdToCheck.trim()}
            className="mt-3 w-full h-11 btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra...</>
            ) : (
              <><Search className="w-4 h-4" /> Kiểm tra ngay</>
            )}
          </button>
        </div>

        {/* Result: Found */}
        {checkStatus === 'found' && foundWorkerId && (
          <div className="rounded-[12px] overflow-hidden border border-[#f5d89a] bg-[#fef7e6]">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-[#f5d89a]/30 border-b border-[#f5d89a]">
              <AlertTriangle className="w-4 h-4 text-[#92400e] shrink-0" />
              <p className="text-xs font-bold text-[#92400e]">Công nhân đã tồn tại</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-xs text-[#92400e] leading-relaxed">
                Số CCCD <span className="font-mono font-semibold bg-white/80 px-1.5 py-0.5 rounded border border-[#f5d89a]">{cccdToCheck}</span> đã được đăng ký trong hệ thống.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/workers/${foundWorkerId}/edit`)}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-[10px] text-xs font-bold text-white bg-[#d97706] hover:bg-[#92400e] transition-all"
              >
                Mở trang chỉnh sửa hồ sơ <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Result: Not Found */}
        {checkStatus === 'not_found' && (
          <div className="rounded-[12px] overflow-hidden border border-[#a7f3d0] bg-[#ecfdf5]">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-[#a7f3d0]/30 border-b border-[#a7f3d0]">
              <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
              <p className="text-xs font-bold text-[#047857]">CCCD hợp lệ!</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-[#047857] leading-relaxed">
                Số CCCD <span className="font-mono font-semibold bg-white/80 px-1.5 py-0.5 rounded border border-[#a7f3d0]">{cccdToCheck}</span> chưa có trong hệ thống. Vui lòng điền đầy đủ thông tin vào biểu mẫu bên phải.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────── */
export default function NewWorkerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cccdToCheck, setCccdToCheck] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'not_found' | 'found'>('idle');
  const [foundWorkerId, setFoundWorkerId] = useState<string | null>(null);

  const checkCccd = async () => {
    if (!cccdToCheck.trim()) return;
    setIsChecking(true);
    const { data } = await supabase.from('workers').select('id').eq('cccd', cccdToCheck.trim()).maybeSingle();
    setIsChecking(false);
    if (data) { setCheckStatus('found'); setFoundWorkerId(data.id); }
    else { setCheckStatus('not_found'); setFoundWorkerId(null); }
  };

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Kích thước ảnh phải nhỏ hơn 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const file = fileInputRef.current?.files?.[0];
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh quá lớn, vui lòng chọn ảnh dưới 5MB');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    if (file) formData.append('portrait', file);
    try {
      const res = await addWorkerAction(formData);
      if (res.success) {
        invalidateDataCache();
        toast.success('✅ Đã lưu hồ sơ thành công!');
        setTimeout(() => { router.push('/workers'); router.refresh(); }, 400);
      } else {
        toast.error(`❌ ${res.error || 'Lỗi khi lưu vào Database'}`);
      }
    } catch (err: any) {
      toast.error(`❌ ${err?.message || 'Lỗi khi lưu vào Database'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-[#f3f5f9]">

      {/* ── Top Nav Bar ── */}
      <header className="bg-white border-b border-[#e3e8ef] px-6 py-3.5 flex items-center gap-4 shrink-0 shadow-[0_1px_2px_rgba(15,27,51,0.04)]">
        <button
          type="button" onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[#5b6577] hover:text-[#1e3a8a] text-sm font-bold transition-all hover:-translate-x-0.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Quay lại
        </button>
        <div className="w-px h-5 bg-[#e3e8ef]" />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-[#1e3a8a]">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-[#0f1b33]">Thêm mới công nhân</h1>
            <p className="text-[11px] text-[#5b6577]">Điền đầy đủ thông tin để tạo hồ sơ</p>
          </div>
        </div>

        {/* Progress breadcrumbs */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          {[
            { label: 'Kiểm tra CCCD', done: checkStatus !== 'idle' },
            { label: 'Điền hồ sơ', done: false },
            { label: 'Hoàn tất', done: false },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                s.done ? 'bg-[#ecfdf5] text-[#047857]' :
                i === 0 ? 'bg-[#1e3a8a] text-white' : 'bg-[#f3f5f9] text-[#5b6577]'
              }`}>
                {s.done && <CheckCircle2 className="w-3 h-3" />}
                {s.label}
              </div>
              {i < 2 && <ArrowRight className="w-3 h-3 text-[#8592a4]" />}
            </React.Fragment>
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* Left: CCCD Panel */}
        <CccdCheckPanel
          cccdToCheck={cccdToCheck}
          setCccdToCheck={setCccdToCheck}
          checkStatus={checkStatus}
          setCheckStatus={setCheckStatus}
          isChecking={isChecking}
          onCheck={checkCccd}
          foundWorkerId={foundWorkerId}
        />

        {/* Right: Form or Empty State */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {checkStatus === 'not_found' ? (
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">

              {/* ── Section 1: Personal ── */}
              <Section number={1} title="Thông Tin Cá Nhân" subtitle="Ảnh chân dung và thông tin định danh" icon={User}>
                <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">

                  {/* Photo Upload */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-400" /> Ảnh chân dung
                    </span>
                    <div className={`relative aspect-[3/4] w-full max-w-[160px] rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-300 group
                      ${isDragging ? 'border-blue-400 bg-blue-50 scale-[1.02] shadow-lg shadow-blue-100'
                        : imagePreview ? 'border-blue-300 shadow-md'
                        : 'border-dashed border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40'}`}
                    >
                      <input
                        type="file" accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="" ref={fileInputRef} onChange={handleImageChange}
                        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                      />
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="text-white text-center">
                              <Camera className="w-5 h-5 mx-auto mb-1" />
                              <span className="text-xs">Đổi ảnh</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); e.preventDefault(); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-slate-500 hover:text-red-500 shadow opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center pointer-events-none">
                          <div className={`p-3 rounded-xl mb-2.5 transition-colors ${isDragging ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-blue-100'}`}>
                            <Upload className={`w-5 h-5 transition-colors ${isDragging ? 'text-blue-500' : 'text-slate-400 group-hover:text-blue-500'}`} />
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {isDragging ? <span className="text-blue-600 font-medium">Thả vào đây</span>
                              : <><span className="text-blue-600 font-medium">Click</span> hoặc<br />kéo thả ảnh</>}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1.5">Tỉ lệ 3:4 · Max 5MB</p>
                        </div>
                      )}
                    </div>
                    {imagePreview && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Đã chọn ảnh
                      </span>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Field id="full_name" name="full_name" label="Họ và Tên" placeholder="Nguyễn Văn An" required icon={User} />
                    </div>
                    <Field id="employee_id" name="employee_id" label="Mã Nhân Viên" placeholder="VD: 6677889" required icon={Hash} />
                    <Field id="cccd" name="cccd" label="Số CCCD" required icon={CreditCard} defaultValue={cccdToCheck} readOnly />
                    <Field id="phone" name="phone" label="Số Điện Thoại" placeholder="0901 234 567" icon={Phone} />
                    <Field id="date_of_birth" name="date_of_birth" label="Ngày Sinh" type="date" icon={Calendar} />
                    <div className="sm:col-span-2">
                      <Field id="address" name="address" label="Địa chỉ thường trú" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" icon={MapPin} />
                    </div>
                  </div>
                </div>
              </Section>

              {/* ── Section 2: Work ── */}
              <Section number={2} title="Thông Tin Công Việc" subtitle="Vị trí, tổ đội và khu vực làm việc" icon={Briefcase}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field id="team_name" name="team_name" label="Tổ Đội" placeholder="VD: Tổ thi công 1" required icon={Users} />
                  <Field id="work_area" name="work_area" label="Khu Vực" placeholder="VD: 540ha, Khu A" required icon={MapPin} />
                  <Field id="position" name="position" label="Chức Vụ / Nghề" placeholder="VD: Thợ xây, ATLĐ" icon={Briefcase} />
                  <Field id="start_date" name="start_date" label="Ngày Vào Làm" type="date" icon={Calendar} />
                  <SelectField id="work_status" name="work_status" label="Tình trạng" icon={CheckCircle2}>
                    <option value="active">Đang làm việc</option>
                    <option value="inactive">Nghỉ việc</option>
                    <option value="on_leave">Tạm nghỉ</option>
                  </SelectField>
                </div>
              </Section>

              {/* ── Section 3: Vehicle ── */}
              <Section number={3} title="Thông Tin Phương Tiện" subtitle="Tùy chọn — để trống nếu không có xe" icon={Car}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="vehicle_plate"
                    name="vehicle_plate"
                    label="Biển Số Xe"
                    placeholder="VD: 59X1-123.45 hoặc 123.45"
                    icon={FileText}
                    onBlur={(e) => {
                      e.target.value = formatVehiclePlate(e.target.value);
                    }}
                  />
                  <SelectField id="vehicle_type" name="vehicle_type" label="Loại Xe" icon={Car}>
                    <option value="">— Không có —</option>
                    <option value="Xe Máy">🏍️ Xe Máy</option>
                    <option value="Ô tô">🚗 Ô Tô</option>
                    <option value="Xe Tải">🚛 Xe Tải</option>
                    <option value="Xe Đạp Điện">⚡ Xe Đạp Điện</option>
                  </SelectField>
                </div>
                <div className="mt-4 p-3.5 rounded-[10px] bg-[#eef2fb] border border-[#c9d4f0] flex items-start gap-2.5">
                  <Car className="w-3.5 h-3.5 text-[#1e3a8a] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#1e3a8a] leading-relaxed font-medium">
                    Thông tin phương tiện sẽ được in trên thanh màu xanh ở mặt sau thẻ ra vào. Nếu không có xe, có thể để trống.
                  </p>
                </div>
              </Section>

              {/* ── Action Bar ── */}
              <div className="bg-white rounded-[12px] border border-[#e3e8ef] shadow-[0_1px_2px_rgba(15,27,51,0.04)] px-6 py-4 flex items-center justify-between">
                <p className="text-xs text-[#5b6577] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#fef2f2] border border-[#f5b5b8] flex items-center justify-center text-[#e31c23] text-[11px] font-bold shrink-0">*</span>
                  Các trường có dấu <span className="text-[#e31c23] font-bold mx-0.5">*</span> là bắt buộc
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button" onClick={() => router.back()}
                    className="btn-secondary"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit" disabled={isSubmitting}
                    className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Lưu Hồ Sơ</>
                    )}
                  </button>
                </div>
              </div>

            </form>
          ) : (
            /* Empty State */
            <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center px-8">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-[#eef2fb] border border-[#c9d4f0]">
                  <CreditCard className="w-10 h-10 text-[#1e3a8a]/50" />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-[10px] flex items-center justify-center bg-[#1e3a8a] text-white shadow-sm">
                  <Search className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-base font-extrabold text-[#0f1b33] mb-2">Kiểm tra CCCD trước</h3>
              <p className="text-sm text-[#5b6577] leading-relaxed max-w-xs">
                Nhập số CCCD/CMND vào bảng bên trái và nhấn <strong className="text-[#0f1b33]">Kiểm tra ngay</strong> để xác nhận công nhân chưa có trong hệ thống.
              </p>
              {checkStatus === 'found' && (
                <div className="mt-6 p-4 rounded-[12px] bg-[#fef7e6] border border-[#f5d89a] max-w-sm text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-[#92400e]" />
                    <p className="text-xs font-bold text-[#92400e]">Công nhân đã tồn tại!</p>
                  </div>
                  <p className="text-xs text-[#92400e]">
                    Vui lòng sử dụng nút <strong>"Mở trang chỉnh sửa"</strong> ở bảng bên trái để cập nhật thông tin.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
