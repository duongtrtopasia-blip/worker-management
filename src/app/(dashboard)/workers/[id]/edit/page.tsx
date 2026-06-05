'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { updateWorkerAction } from '@/app/actions/worker';
import { supabase } from '@/lib/supabase';
import { DocumentUploader } from '@/components/documents/DocumentUploader';
import {
  User, Hash, CreditCard, Users, MapPin, Briefcase, Phone, Calendar,
  Car, FileText, Camera, Upload, ChevronLeft, Save, X, CheckCircle2,
  FolderOpen, AlertCircle, ClipboardList, Loader2, ArrowRight
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
  id, name, label, icon: Icon, children, defaultValue
}: {
  id: string; name: string; label: string; icon: React.ElementType; children: React.ReactNode; defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5 text-blue-400" />
        {label}
      </label>
      <select
        id={id} name={name} defaultValue={defaultValue}
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
  number?: number; title: string; subtitle: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-50"
        style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.03) 0%, rgba(255,255,255,0) 100%)' }}>
        {number && (
          <div className="flex items-center justify-center w-8 h-8 rounded-xl text-white text-sm font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)' }}>
            {number}
          </div>
        )}
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
   Main Edit Page
───────────────────────────────────────────────────────── */
export default function EditWorkerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [worker, setWorker] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'docs'>('info');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: wData, error }, { data: dData }] = await Promise.all([
      supabase.from('workers').select('*').eq('id', params.id).single(),
      supabase.from('documents').select('*').eq('worker_id', params.id),
    ]);
    if (error || !wData) {
      toast.error('Không tìm thấy thông tin công nhân');
      router.push('/workers');
      return;
    }
    setWorker(wData);
    setDocuments(dData || []);
    if (wData.portrait_url) setImagePreview(wData.portrait_url);
    setLoading(false);
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
    if (imagePreview && imagePreview === worker?.portrait_url) {
      formData.append('existing_portrait_url', worker.portrait_url);
    } else {
      formData.append('existing_portrait_url', '');
    }
    try {
      const res = await updateWorkerAction(params.id, formData);
      if (res.success) {
        toast.success('Đã cập nhật hồ sơ công nhân!');
        setTimeout(() => { router.push('/workers'); router.refresh(); }, 1000);
      }
    } catch {
      toast.error('Lỗi khi cập nhật hồ sơ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDoc = (type: string) => documents.find(d => d.doc_type === type);

  const DOC_TYPES = [
    { type: 'cccd_notarized',    label: 'CCCD Công Chứng',         icon: CreditCard, note: 'Bản công chứng còn hiệu lực' },
    { type: 'health_certificate',label: 'Giấy Khám Sức Khỏe',      icon: ClipboardList, note: 'Hiệu lực 6 tháng kể từ ngày cấp' },
    { type: 'safety_card',       label: 'Thẻ An Toàn Lao Động',    icon: CheckCircle2, note: 'Thẻ ATLĐ do đơn vị cấp' },
    { type: 'safety_commitment', label: 'Cam Kết An Toàn',          icon: FileText,  note: 'Biên bản cam kết lao động' },
  ];

  const completedDocs = DOC_TYPES.filter(d => getDoc(d.type)).length;

  if (loading) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-8" style={{ background: '#f1f5f9' }}>
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500 animate-pulse">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (!worker) return null;

  return (
    <div className="min-h-full flex flex-col" style={{ background: '#f1f5f9' }}>

      {/* ── Top Nav Bar ── */}
      <header className="bg-white border-b border-slate-100 px-6 py-3.5 flex items-center gap-4 shrink-0 shadow-sm z-10">
        <button
          type="button" onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-400 hover:text-blue-700 text-sm font-medium transition-all hover:-translate-x-0.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Quay lại
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 truncate">
            <h1 className="text-sm font-bold text-slate-800 truncate">Chỉnh Sửa: {worker.full_name}</h1>
            <p className="text-[11px] text-slate-400 font-mono">MNV: {worker.mnv}</p>
          </div>
        </div>

        {/* Tab switcher in header */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'info' ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Thông tin
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'docs' ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tài liệu
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              completedDocs === DOC_TYPES.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {completedDocs}/{DOC_TYPES.length}
            </span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* ── TAB: Thông tin ── */}
          {activeTab === 'info' && (
            <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* Section 1: Personal */}
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
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-100 items-center justify-center text-center hidden pointer-events-none flex-col gap-2">
                            <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="text-[10px] text-slate-400 font-medium px-2">Không tải được ảnh</p>
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="text-white text-center">
                              <Camera className="w-5 h-5 mx-auto mb-1" />
                              <span className="text-xs font-medium">Đổi ảnh</span>
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
                        <CheckCircle2 className="w-3 h-3" /> Đã có ảnh
                      </span>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Field id="full_name" name="full_name" label="Họ và Tên" placeholder="Nguyễn Văn An" required icon={User} defaultValue={worker.full_name} />
                    </div>
                    <Field id="employee_id" name="employee_id" label="Mã Nhân Viên" placeholder="VD: 6677889" required icon={Hash} defaultValue={worker.mnv} />
                    <Field id="cccd" name="cccd" label="Số CCCD" required icon={CreditCard} defaultValue={worker.cccd} maxLength={12} />
                    <Field id="phone" name="phone" label="Số Điện Thoại" placeholder="0901 234 567" icon={Phone} defaultValue={worker.phone || ''} />
                    <Field id="date_of_birth" name="date_of_birth" label="Ngày Sinh" type="date" icon={Calendar} defaultValue={worker.date_of_birth || ''} />
                    <div className="sm:col-span-2">
                      <Field id="address" name="address" label="Địa chỉ thường trú" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" icon={MapPin} defaultValue={worker.address || ''} />
                    </div>
                  </div>
                </div>
              </Section>

              {/* Section 2: Work */}
              <Section number={2} title="Thông Tin Công Việc" subtitle="Vị trí, tổ đội và khu vực làm việc" icon={Briefcase}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field id="team_name" name="team_name" label="Tổ Đội" placeholder="VD: Tổ thi công 1" required icon={Users} defaultValue={worker.team} />
                  <Field id="work_area" name="work_area" label="Khu Vực" placeholder="VD: 540ha, Khu A" required icon={MapPin} defaultValue={worker.area} />
                  <Field id="position" name="position" label="Chức Vụ / Nghề" placeholder="VD: Thợ xây, ATLĐ" icon={Briefcase} defaultValue={worker.position || ''} />
                  <Field id="start_date" name="start_date" label="Ngày Vào Làm" type="date" icon={Calendar} defaultValue={worker.start_date || ''} />
                  <SelectField id="work_status" name="work_status" label="Tình trạng" icon={CheckCircle2} defaultValue={worker.work_status || 'active'}>
                    <option value="active">Đang làm việc</option>
                    <option value="inactive">Nghỉ việc</option>
                    <option value="on_leave">Tạm nghỉ</option>
                  </SelectField>
                </div>
              </Section>

              {/* Section 3: Vehicle */}
              <Section number={3} title="Thông Tin Phương Tiện" subtitle="Tùy chọn — để trống nếu không có xe" icon={Car}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="vehicle_plate" name="vehicle_plate" label="Biển Số Xe" placeholder="VD: 59X1-123.45" icon={FileText} defaultValue={worker.vehicle_plate || ''} />
                  <SelectField id="vehicle_type" name="vehicle_type" label="Loại Xe" icon={Car} defaultValue={worker.vehicle_type || ''}>
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

              {/* Action Bar */}
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
                      <><Save className="w-4 h-4" /> Lưu Thay Đổi</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ── TAB: Hồ sơ tài liệu ── */}
          {activeTab === 'docs' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Section title="Hồ Sơ Tài Liệu" subtitle={`Thư mục: ${worker.mnv}-${worker.cccd} trên hệ thống`} icon={FolderOpen}>
                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-700">Tiến độ hoàn thiện hồ sơ</span>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${completedDocs === DOC_TYPES.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {completedDocs}/{DOC_TYPES.length} tài liệu
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${completedDocs === DOC_TYPES.length ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-amber-400'}`}
                      style={{ width: `${(completedDocs / DOC_TYPES.length) * 100}%` }}
                    />
                  </div>
                  {completedDocs === DOC_TYPES.length && (
                    <div className="mt-3 flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Hồ sơ đầy đủ! Công nhân đã đủ điều kiện cấp thẻ.
                    </div>
                  )}
                </div>

                {/* Document uploaders grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DOC_TYPES.map(({ type, label, icon, note }) => {
                    const existingDoc = getDoc(type);
                    return (
                      <DocumentUploader
                        key={type}
                        workerId={worker.id}
                        docType={type as any}
                        existingDocUrl={existingDoc?.file_url}
                        existingIssueDate={existingDoc?.issue_date}
                        label={label}
                        note={note}
                        icon={icon}
                        hasDoc={!!existingDoc}
                        onSuccess={fetchData}
                      />
                    );
                  })}
                </div>
              </Section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
