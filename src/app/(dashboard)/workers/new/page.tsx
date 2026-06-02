'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { addWorkerAction } from '@/app/actions/worker';
import {
  User, Hash, CreditCard, Users, MapPin, Briefcase, Phone, Calendar,
  Car, FileText, Camera, Upload, ChevronLeft, Save, X, CheckCircle2
} from 'lucide-react';

/* ── Reusable Field Component ─────────────────────────────── */
function FormField({
  id, name, label, placeholder, required, type = 'text', icon: Icon, maxLength,
}: {
  id: string; name: string; label: string; placeholder?: string;
  required?: boolean; type?: string; icon: React.ElementType; maxLength?: number;
}) {
  return (
    <div className="group">
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        <Icon className="w-3.5 h-3.5 text-brand-blue/60" />
        {label}
        {required && <span className="text-brand-red ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 bg-gray-50/80 text-gray-800 text-sm
            placeholder:text-gray-400 transition-all duration-200
            focus:outline-none focus:border-brand-blue/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(30,58,138,0.06)]
            hover:border-gray-200 hover:bg-white"
        />
      </div>
    </div>
  );
}

/* ── Select Field Component ───────────────────────────────── */
function SelectField({
  id, name, label, icon: Icon, children,
}: {
  id: string; name: string; label: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="group">
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        <Icon className="w-3.5 h-3.5 text-brand-blue/60" />
        {label}
      </label>
      <select
        id={id}
        name={name}
        className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 bg-gray-50/80 text-gray-800 text-sm
          transition-all duration-200 cursor-pointer appearance-none
          focus:outline-none focus:border-brand-blue/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(30,58,138,0.06)]
          hover:border-gray-200 hover:bg-white"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
      >
        {children}
      </select>
    </div>
  );
}

/* ── Section Card Component ───────────────────────────────── */
function SectionCard({ title, subtitle, icon: Icon, accentColor = 'blue', children }: {
  title: string; subtitle: string; icon: React.ElementType;
  accentColor?: 'blue' | 'green'; children: React.ReactNode;
}) {
  const accent = accentColor === 'green'
    ? { border: 'border-green-500/20', bg: 'from-green-50/80', icon: 'bg-green-100 text-green-600', dot: 'bg-green-500' }
    : { border: 'border-brand-blue/15', bg: 'from-blue-50/60', icon: 'bg-brand-blue/10 text-brand-blue', dot: 'bg-brand-blue' };

  return (
    <div className={`bg-white rounded-2xl border ${accent.border} shadow-sm overflow-hidden`}>
      <div className={`px-6 py-4 bg-gradient-to-r ${accent.bg} to-white border-b ${accent.border} flex items-center gap-3`}>
        <div className={`p-2 rounded-xl ${accent.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <div className={`ml-auto w-1.5 h-1.5 rounded-full ${accent.dot}`} />
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────── */
export default function NewWorkerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh phải nhỏ hơn 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
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
      const msg = err?.message || 'Lỗi khi lưu vào Database';
      toast.error(`❌ ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full p-6 lg:p-8" style={{ background: '#f0f4f8' }}>

      {/* ── Page Header ── */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl text-gray-400 hover:text-brand-blue hover:bg-white hover:shadow-sm transition-all duration-200"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Thêm Công Nhân Mới</h1>
            <p className="text-sm text-gray-500 mt-0.5">Điền đầy đủ thông tin để tạo hồ sơ và thẻ ra vào</p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mt-4 ml-11">
          {['Thông tin cá nhân', 'Thông tin công việc', 'Phương tiện'].map((step, i) => (
            <React.Fragment key={step}>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i === 0 ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === 0 ? 'text-brand-blue' : 'text-gray-400'}`}>
                  {step}
                </span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-gray-200 max-w-[40px]" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-5">

        {/* ── Section 1: Personal Info ── */}
        <SectionCard title="Thông Tin Cá Nhân" subtitle="Ảnh chân dung và các thông tin định danh" icon={User}>
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">

            {/* Photo Upload */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider self-start flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-brand-blue/60" />
                Ảnh chân dung
              </span>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  relative w-full aspect-[3/4] max-w-[160px] rounded-2xl cursor-pointer overflow-hidden
                  border-2 transition-all duration-300 group
                  ${isDragging
                    ? 'border-brand-blue bg-brand-blue/5 scale-[1.02] shadow-lg shadow-brand-blue/20'
                    : imagePreview
                    ? 'border-brand-blue/30 shadow-md'
                    : 'border-dashed border-gray-200 bg-gray-50 hover:border-brand-blue/40 hover:bg-blue-50/30'}
                `}
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
                      {isDragging ? (
                        <span className="text-brand-blue font-medium">Thả ảnh vào đây</span>
                      ) : (
                        <>Kéo thả hoặc<br /><span className="text-brand-blue font-medium">click để chọn</span></>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2">Tỉ lệ 3:4 · Max 5MB</p>
                  </div>
                )}
                <input
                  type="file" accept="image/*" className="hidden"
                  ref={fileInputRef} onChange={handleImageChange}
                />
              </div>
              {imagePreview && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã chọn ảnh
                </div>
              )}
            </div>

            {/* Identity Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormField id="full_name" name="full_name" label="Họ và Tên" placeholder="Nguyễn Văn An" required icon={User} />
              </div>
              <FormField id="employee_id" name="employee_id" label="Mã Nhân Viên" placeholder="VD: 6677889" required icon={Hash} />
              <FormField id="cccd" name="cccd" label="Số CCCD" placeholder="012345678910" required icon={CreditCard} maxLength={12} />
              <FormField id="phone" name="phone" label="Số Điện Thoại" placeholder="0901 234 567" icon={Phone} />
              <FormField id="start_date" name="start_date" label="Ngày Vào Làm" type="date" icon={Calendar} />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 2: Work Info ── */}
        <SectionCard title="Thông Tin Công Việc" subtitle="Vị trí, tổ đội và khu vực làm việc" icon={Briefcase}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField id="team_name" name="team_name" label="Tổ Đội" placeholder="VD: Tổ thi công 1" required icon={Users} />
            <FormField id="work_area" name="work_area" label="Khu Vực Làm Việc" placeholder="VD: 540ha, Khu A" required icon={MapPin} />
            <FormField id="position" name="position" label="Chức Vụ / Nghề" placeholder="VD: Thợ xây, ATLĐ" icon={Briefcase} />
          </div>
        </SectionCard>

        {/* ── Section 3: Vehicle Info ── */}
        <SectionCard title="Thông Tin Phương Tiện" subtitle="Tùy chọn — để trống nếu không có xe" icon={Car} accentColor="green">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="vehicle_plate" name="vehicle_plate" label="Biển Số Xe" placeholder="VD: 59X1-123.45" icon={FileText} />
            <SelectField id="vehicle_type" name="vehicle_type" label="Loại Xe" icon={Car}>
              <option value="">— Không có —</option>
              <option value="Xe Máy">🏍️ Xe Máy</option>
              <option value="Ô tô">🚗 Ô Tô</option>
              <option value="Xe Tải">🚛 Xe Tải</option>
              <option value="Xe Đạp Điện">⚡ Xe Đạp Điện</option>
            </SelectField>
          </div>

          {/* Visual hint */}
          <div className="mt-4 p-3 rounded-xl bg-green-50/80 border border-green-100 flex items-start gap-2.5">
            <div className="p-1 rounded-lg bg-green-100 mt-0.5">
              <Car className="w-3.5 h-3.5 text-green-600" />
            </div>
            <p className="text-xs text-green-700 leading-relaxed">
              Thông tin phương tiện sẽ được in trên thanh màu xanh ở thẻ ra vào.
              Nếu không có xe, thanh vẫn hiển thị nhưng để trống.
            </p>
          </div>
        </SectionCard>

        {/* ── Action Buttons ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="text-brand-red font-bold">*</span>
              Các trường bắt buộc phải điền
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 border-2 border-gray-200
                  hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
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
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Lưu Hồ Sơ
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
