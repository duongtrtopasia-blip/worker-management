'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { addWorkerAction } from '@/app/actions/worker';
import { supabase } from '@/lib/supabase';
import {
  User, Hash, CreditCard, Users, MapPin, Briefcase, Phone, Calendar,
  Car, FileText, Camera, Upload, ChevronLeft, Save, X, CheckCircle2,
  AlertTriangle, Search, ArrowRight, Loader2, Shield, Sparkles
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Shared input styles
───────────────────────────────────────────────────────────── */
const inputBase =
  'w-full h-11 px-4 rounded-xl border-2 border-slate-100 bg-slate-50/80 text-slate-800 text-sm ' +
  'placeholder:text-slate-400 transition-all duration-200 ' +
  'focus:outline-none focus:border-blue-400/60 focus:bg-white focus:shadow-[0_0_0_4px_rgba(30,58,138,0.08)] ' +
  'hover:border-slate-200 hover:bg-white';

/* ─────────────────────────────────────────────────────────────
   Field Components
───────────────────────────────────────────────────────── */
function Field({
  id, name, label, placeholder, required, type = 'text',
  icon: Icon, maxLength, defaultValue, readOnly,
}: {
  id: string; name: string; label: string; placeholder?: string;
  required?: boolean; type?: string; icon: React.ElementType; maxLength?: number;
  defaultValue?: string; readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5 text-blue-400" />
        {label}
        {required && <span className="text-rose-500 ml-0.5 normal-case tracking-normal font-bold">*</span>}
      </label>
      <input
        id={id} name={name} type={type}
        required={required} placeholder={placeholder}
        maxLength={maxLength} defaultValue={defaultValue}
        readOnly={readOnly}
        className={`${inputBase} ${readOnly ? '!bg-slate-100 !border-slate-200 cursor-not-allowed text-slate-500' : ''}`}
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
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5 text-blue-400" />
        {label}
      </label>
      <select
        id={id} name={name}
        className={`${inputBase} cursor-pointer appearance-none`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-50"
        style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.03) 0%, rgba(255,255,255,0) 100%)' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-xl text-white text-sm font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)' }}>
          {number}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-50">
          <Icon className="w-4 h-4 text-slate-400" />
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
    <aside className="w-full md:w-[340px] lg:w-[400px] shrink-0 bg-white border-r border-slate-100 flex flex-col overflow-y-auto">
      {/* Panel Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-50">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg,#1e3a8a,#970731)' }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Kiểm tra CCCD</h2>
        </div>
        <p className="text-xs text-slate-400 ml-8">Bước bắt buộc trước khi tạo hồ sơ</p>
      </div>

      {/* Steps indicator */}
      <div className="px-6 py-5 flex flex-col gap-3">
        {/* Step 1 */}
        <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
          checkStatus === 'idle' ? 'bg-blue-50 border-2 border-blue-200' : 'bg-slate-50 border-2 border-transparent opacity-60'
        }`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
            checkStatus !== 'idle' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'
          }`}>
            {checkStatus !== 'idle' ? <CheckCircle2 className="w-4 h-4" /> : '1'}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Nhập số CCCD/CMND</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Bắt buộc — 9 hoặc 12 chữ số</p>
          </div>
        </div>

        {/* Connector */}
        <div className="w-px h-4 bg-slate-200 ml-5" />

        {/* Step 2 */}
        <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
          checkStatus === 'not_found' ? 'bg-emerald-50 border-2 border-emerald-200' :
          checkStatus === 'found' ? 'bg-amber-50 border-2 border-amber-200' :
          'bg-slate-50 border-2 border-transparent opacity-40'
        }`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
            checkStatus === 'not_found' ? 'bg-emerald-500 text-white' :
            checkStatus === 'found' ? 'bg-amber-500 text-white' :
            'bg-slate-300 text-white'
          }`}>
            {checkStatus === 'not_found' ? <CheckCircle2 className="w-4 h-4" /> :
             checkStatus === 'found' ? <AlertTriangle className="w-4 h-4" /> : '2'}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Kết quả kiểm tra</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {checkStatus === 'not_found' ? 'CCCD hợp lệ, có thể thêm mới' :
               checkStatus === 'found' ? 'Đã tồn tại trong hệ thống' :
               'Chờ kiểm tra...'}
            </p>
          </div>
        </div>

        {/* Connector */}
        <div className="w-px h-4 bg-slate-200 ml-5" />

        {/* Step 3 */}
        <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
          checkStatus === 'not_found' ? 'bg-blue-50 border-2 border-blue-200' : 'bg-slate-50 border-2 border-transparent opacity-40'
        }`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
            checkStatus === 'not_found' ? 'bg-blue-600 text-white' : 'bg-slate-300 text-white'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Điền hồ sơ & lưu</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Thông tin cá nhân, công việc, xe</p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="px-6 pb-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            Số CCCD / CMND <span className="text-rose-500">*</span>
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
            className="mt-3 w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px hover:shadow-lg"
            style={{ background: isChecking || !cccdToCheck.trim() ? '#94a3b8' : 'linear-gradient(135deg, #1e3a8a, #970731)', boxShadow: cccdToCheck.trim() && !isChecking ? '0 4px 14px rgba(30,58,138,0.3)' : 'none' }}
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
          <div className="rounded-2xl overflow-hidden border border-amber-200 bg-amber-50">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-100/60 border-b border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs font-bold text-amber-800">Công nhân đã tồn tại</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-xs text-amber-700 leading-relaxed">
                Số CCCD <span className="font-mono font-semibold bg-amber-200 px-1.5 py-0.5 rounded">{cccdToCheck}</span> đã được đăng ký trong hệ thống.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/workers/${foundWorkerId}/edit`)}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
              >
                Mở trang chỉnh sửa hồ sơ <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Result: Not Found */}
        {checkStatus === 'not_found' && (
          <div className="rounded-2xl overflow-hidden border border-emerald-200 bg-emerald-50">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-100/60 border-b border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs font-bold text-emerald-800">CCCD hợp lệ!</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-emerald-700 leading-relaxed">
                Số CCCD <span className="font-mono font-semibold bg-emerald-200 px-1.5 py-0.5 rounded">{cccdToCheck}</span> chưa có trong hệ thống. Vui lòng điền đầy đủ thông tin vào biểu mẫu bên phải.
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
    const formData = new FormData(e.currentTarget);
    const file = fileInputRef.current?.files?.[0];
    if (file) formData.append('portrait', file);
    try {
      const res = await addWorkerAction(formData);
      if (res.success) {
        toast.success('✅ Đã lưu hồ sơ thành công!');
        setTimeout(() => { router.push('/workers'); router.refresh(); }, 1200);
      }
    } catch (err: any) {
      toast.error(`❌ ${err?.message || 'Lỗi khi lưu vào Database'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col" style={{ background: '#f1f5f9' }}>

      {/* ── Top Nav Bar ── */}
      <header className="bg-white border-b border-slate-100 px-6 py-3.5 flex items-center gap-4 shrink-0 shadow-sm">
        <button
          type="button" onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-400 hover:text-blue-700 text-sm font-medium transition-all hover:-translate-x-0.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Quay lại
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Thêm mới công nhân</h1>
            <p className="text-[11px] text-slate-400">Điền đầy đủ thông tin để tạo hồ sơ</p>
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
              <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                s.done ? 'bg-emerald-100 text-emerald-700' :
                i === 0 ? 'text-white' : 'bg-slate-100 text-slate-400'
              }`} style={i === 0 && !s.done ? { background: 'linear-gradient(135deg, #1e3a8a, #2563eb)' } : {}}>
                {s.done && <CheckCircle2 className="w-3 h-3" />}
                {s.label}
              </div>
              {i < 2 && <ArrowRight className="w-3 h-3 text-slate-300" />}
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
                  <Field id="vehicle_plate" name="vehicle_plate" label="Biển Số Xe" placeholder="VD: 59X1-123.45" icon={FileText} />
                  <SelectField id="vehicle_type" name="vehicle_type" label="Loại Xe" icon={Car}>
                    <option value="">— Không có —</option>
                    <option value="Xe Máy">🏍️ Xe Máy</option>
                    <option value="Ô tô">🚗 Ô Tô</option>
                    <option value="Xe Tải">🚛 Xe Tải</option>
                    <option value="Xe Đạp Điện">⚡ Xe Đạp Điện</option>
                  </SelectField>
                </div>
                <div className="mt-4 p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5">
                  <Car className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Thông tin phương tiện sẽ được in trên thanh màu xanh ở mặt sau thẻ ra vào. Nếu không có xe, có thể để trống.
                  </p>
                </div>
              </Section>

              {/* ── Action Bar ── */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 flex items-center justify-between">
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 text-[9px] font-bold shrink-0">*</span>
                  Các trường có dấu <span className="text-rose-500 font-bold mx-0.5">*</span> là bắt buộc
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button" onClick={() => router.back()}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit" disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-blue-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #1e3a8a, #970731)' }}
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
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.08), rgba(151,7,49,0.06))' }}>
                  <CreditCard className="w-10 h-10 text-slate-300" />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-200">
                  <Search className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-600 mb-2">Kiểm tra CCCD trước</h3>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                Nhập số CCCD/CMND vào bảng bên trái và nhấn <strong className="text-slate-500">Kiểm tra ngay</strong> để xác nhận công nhân chưa có trong hệ thống.
              </p>
              {checkStatus === 'found' && (
                <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 max-w-sm text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-xs font-bold text-amber-800">Công nhân đã tồn tại!</p>
                  </div>
                  <p className="text-xs text-amber-700">
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
