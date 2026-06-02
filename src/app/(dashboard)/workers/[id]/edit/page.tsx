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
  FolderOpen, AlertCircle, ClipboardList
} from 'lucide-react';

/* ── Reusable Form Field ──────────────────────────────────── */
function FormField({ id, name, label, placeholder, required, type = 'text', icon: Icon, maxLength, defaultValue }: {
  id: string; name: string; label: string; placeholder?: string;
  required?: boolean; type?: string; icon: React.ElementType;
  maxLength?: number; defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        <Icon className="w-3.5 h-3.5 text-brand-blue/60" />
        {label}
        {required && <span className="text-brand-red ml-0.5">*</span>}
      </label>
      <input
        id={id} name={name} type={type} required={required}
        placeholder={placeholder} maxLength={maxLength}
        defaultValue={defaultValue}
        className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 bg-gray-50/80 text-gray-800 text-sm
          placeholder:text-gray-400 transition-all duration-200
          focus:outline-none focus:border-brand-blue/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(30,58,138,0.06)]
          hover:border-gray-200 hover:bg-white"
      />
    </div>
  );
}

/* ── Section Card ─────────────────────────────────────────── */
function SectionCard({ title, subtitle, icon: Icon, accentColor = 'blue', children }: {
  title: string; subtitle: string; icon: React.ElementType;
  accentColor?: 'blue' | 'green' | 'purple'; children: React.ReactNode;
}) {
  const accents: Record<string, any> = {
    blue:   { border: 'border-brand-blue/15', bg: 'from-blue-50/60',   icon: 'bg-brand-blue/10 text-brand-blue', dot: 'bg-brand-blue' },
    green:  { border: 'border-green-500/20',  bg: 'from-green-50/80',  icon: 'bg-green-100 text-green-600',      dot: 'bg-green-500' },
    purple: { border: 'border-purple-500/20', bg: 'from-purple-50/80', icon: 'bg-purple-100 text-purple-600',    dot: 'bg-purple-500' },
  };
  const a = accents[accentColor];
  return (
    <div className={`bg-white rounded-2xl border ${a.border} shadow-sm overflow-hidden`}>
      <div className={`px-6 py-4 bg-gradient-to-r ${a.bg} to-white border-b ${a.border} flex items-center gap-3`}>
        <div className={`p-2 rounded-xl ${a.icon}`}><Icon className="w-4 h-4" /></div>
        <div>
          <h2 className="text-sm font-bold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <div className={`ml-auto w-1.5 h-1.5 rounded-full ${a.dot}`} />
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ── Main Edit Page ───────────────────────────────────────── */
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const file = fileInputRef.current?.files?.[0];
    if (file) formData.append('portrait', file);
    if (worker?.portrait_url) formData.append('existing_portrait_url', worker.portrait_url);
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
      <div className="min-h-full flex items-center justify-center p-8" style={{ background: '#f0f4f8' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!worker) return null;

  return (
    <div className="min-h-full p-6 lg:p-8" style={{ background: '#f0f4f8' }}>

      {/* ── Header ── */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl text-gray-400 hover:text-brand-blue hover:bg-white hover:shadow-sm transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Chỉnh Sửa Hồ Sơ</h1>
            <p className="text-sm text-gray-400 mt-0.5 truncate">
              {worker.full_name} &middot; MNV: <span className="font-mono font-semibold text-brand-blue">{worker.mnv}</span>
            </p>
          </div>
          {/* Tab switcher in header */}
          <div className="flex bg-white rounded-xl border border-gray-100 shadow-sm p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'info'
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === 'info' ? { background: 'linear-gradient(135deg, #1e3a8a, #970731)' } : {}}
            >
              Thông tin
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'docs'
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === 'docs' ? { background: 'linear-gradient(135deg, #1e3a8a, #970731)' } : {}}
            >
              Hồ sơ tài liệu
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                completedDocs === DOC_TYPES.length
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {completedDocs}/{DOC_TYPES.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB: Thông tin ── */}
      {activeTab === 'info' && (
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-5">

          {/* Section 1: Personal */}
          <SectionCard title="Thông Tin Cá Nhân" subtitle="Ảnh chân dung và thông tin định danh" icon={User}>
            <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">

              {/* Photo */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider self-start flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-brand-blue/60" /> Ảnh chân dung
                </span>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  className={`relative w-full aspect-[3/4] max-w-[150px] rounded-2xl cursor-pointer overflow-hidden border-2 transition-all duration-300 group
                    ${isDragging
                      ? 'border-brand-blue bg-brand-blue/5 scale-[1.02] shadow-lg shadow-brand-blue/20'
                      : imagePreview
                        ? 'border-brand-blue/30 shadow-md'
                        : 'border-dashed border-gray-200 bg-gray-50 hover:border-brand-blue/40 hover:bg-blue-50/30'
                    }`}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-center">
                          <Camera className="w-6 h-6 mx-auto mb-1" />
                          <span className="text-xs font-medium">Đổi ảnh</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-gray-600 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                      <div className={`p-3 rounded-2xl mb-3 transition-colors ${isDragging ? 'bg-brand-blue/10' : 'bg-gray-100 group-hover:bg-brand-blue/10'}`}>
                        <Upload className={`w-6 h-6 transition-colors ${isDragging ? 'text-brand-blue' : 'text-gray-400 group-hover:text-brand-blue'}`} />
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Kéo thả hoặc<br /><span className="text-brand-blue font-medium">click để chọn</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-2">Tỉ lệ 3:4 · Max 5MB</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                </div>
                {imagePreview && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã chọn ảnh
                  </div>
                )}
              </div>

              {/* Identity Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FormField id="full_name" name="full_name" label="Họ và Tên" required icon={User} defaultValue={worker.full_name} />
                </div>
                <FormField id="employee_id" name="employee_id" label="Mã Nhân Viên" required icon={Hash} defaultValue={worker.mnv} />
                <FormField id="cccd" name="cccd" label="Số CCCD" required icon={CreditCard} maxLength={12} defaultValue={worker.cccd} />
                <FormField id="phone" name="phone" label="Số Điện Thoại" icon={Phone} placeholder="0901 234 567" defaultValue={worker.phone || ''} />
                <FormField id="start_date" name="start_date" label="Ngày Vào Làm" type="date" icon={Calendar} defaultValue={worker.start_date || ''} />
              </div>
            </div>
          </SectionCard>

          {/* Section 2: Work Info */}
          <SectionCard title="Thông Tin Công Việc" subtitle="Vị trí, tổ đội và khu vực làm việc" icon={Briefcase}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField id="team_name" name="team_name" label="Tổ Đội" required icon={Users} defaultValue={worker.team} />
              <FormField id="work_area" name="work_area" label="Khu Vực Làm Việc" required icon={MapPin} defaultValue={worker.area} />
              <FormField id="position" name="position" label="Chức Vụ / Nghề" icon={Briefcase} placeholder="Thợ xây, ATLĐ..." defaultValue={worker.position || ''} />
            </div>
          </SectionCard>

          {/* Section 3: Vehicle */}
          <SectionCard title="Thông Tin Phương Tiện" subtitle="Tùy chọn — để trống nếu không có xe" icon={Car} accentColor="green">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="vehicle_plate" name="vehicle_plate" label="Biển Số Xe" icon={FileText} placeholder="VD: 59X1-123.45" defaultValue={worker.vehicle_plate || ''} />
              <div>
                <label htmlFor="vehicle_type" className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  <Car className="w-3.5 h-3.5 text-brand-blue/60" /> Loại Xe
                </label>
                <select
                  id="vehicle_type" name="vehicle_type"
                  defaultValue={worker.vehicle_type || ''}
                  className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 bg-gray-50/80 text-gray-800 text-sm
                    transition-all duration-200 cursor-pointer appearance-none
                    focus:outline-none focus:border-brand-blue/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(30,58,138,0.06)]
                    hover:border-gray-200 hover:bg-white"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                >
                  <option value="">— Không có —</option>
                  <option value="Xe Máy">🏍️ Xe Máy</option>
                  <option value="Ô tô">🚗 Ô Tô</option>
                  <option value="Xe Tải">🚛 Xe Tải</option>
                  <option value="Xe Đạp Điện">⚡ Xe Đạp Điện</option>
                </select>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-green-50/80 border border-green-100 flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-green-100 mt-0.5">
                <Car className="w-3.5 h-3.5 text-green-600" />
              </div>
              <p className="text-xs text-green-700 leading-relaxed">
                Thông tin phương tiện sẽ được in trên thanh màu xanh ở thẻ ra vào.
              </p>
            </div>
          </SectionCard>

          {/* Action Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="text-brand-red font-bold">*</span> Các trường bắt buộc phải điền
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button" onClick={() => router.back()}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit" disabled={isSubmitting}
                  className="relative px-6 py-2.5 rounded-xl text-sm font-semibold text-white overflow-hidden
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200
                    hover:shadow-lg hover:shadow-brand-blue/30 hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: isSubmitting ? '#6b7280' : 'linear-gradient(135deg, #1e3a8a 0%, #970731 100%)' }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      Đang lưu...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Lưu Thay Đổi</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ── TAB: Hồ sơ tài liệu ── */}
      {activeTab === 'docs' && (
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Header card */}
          <SectionCard title="Hồ Sơ Tài Liệu" subtitle={`Thư mục: ${worker.mnv}-${worker.cccd} trên Google Drive`} icon={FolderOpen} accentColor="purple">
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Tiến độ hoàn thiện hồ sơ</span>
                <span className={`text-sm font-bold ${completedDocs === DOC_TYPES.length ? 'text-green-600' : 'text-amber-600'}`}>
                  {completedDocs}/{DOC_TYPES.length} tài liệu
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${completedDocs === DOC_TYPES.length ? 'bg-green-500' : 'bg-gradient-to-r from-brand-blue to-amber-400'}`}
                  style={{ width: `${(completedDocs / DOC_TYPES.length) * 100}%` }}
                />
              </div>
              {completedDocs === DOC_TYPES.length && (
                <div className="mt-3 flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Hồ sơ đầy đủ! Công nhân đủ điều kiện được cấp thẻ.
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
          </SectionCard>
        </div>
      )}
    </div>
  );
}
