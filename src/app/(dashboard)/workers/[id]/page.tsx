'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Printer,
  Edit,
  Camera,
  CreditCard,
  Shield,
  FileText,
  ClipboardList,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { getCachedWorkers, getCachedDocuments, invalidateDataCache } from '@/lib/data-cache';
import { DocumentUploader } from '@/components/documents/DocumentUploader';
import { formatVehiclePlate } from '@/lib/format-vehicle';

export default function WorkerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const cachedWorker = getCachedWorkers()?.find((w) => w.id === params.id) || null;
  const cachedDocs = getCachedDocuments()?.filter((d) => d.worker_id === params.id) || null;
  const [loading, setLoading] = useState(!cachedWorker);
  const [worker, setWorker] = useState<any>(cachedWorker);
  const [documents, setDocuments] = useState<any[]>(cachedDocs || []);
  const [activeTab, setActiveTab] = useState<'info' | 'docs'>('info');
  const [imgError, setImgError] = useState(false);

  const fetchData = async (isDocRefresh = false) => {
    if (isDocRefresh) invalidateDataCache();
    if (!worker && !isDocRefresh) setLoading(true);
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
    setLoading(false);
  };

  useEffect(() => {
    fetchData(false);
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <Loader2 className="w-9 h-9 text-[#1e3a8a] animate-spin mb-3" />
        <p className="text-sm font-medium text-[#5b6577]">Đang tải hồ sơ công nhân...</p>
      </div>
    );
  }

  if (!worker) return null;

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const startDate = new Date(worker.start_date || worker.created_at);
  const expiryDate = new Date(startDate);
  expiryDate.setMonth(expiryDate.getMonth() + 6);
  const diffDays = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const validityPct = Math.max(0, Math.min(100, Math.round((diffDays / 180) * 100)));

  const getDoc = (type: string) => documents.find((d) => d.doc_type === type);

  const DOC_TYPES = [
    {
      type: 'cccd_notarized',
      label: 'CCCD Công Chứng',
      icon: CreditCard,
      note: 'Bản công chứng còn hiệu lực',
    },
    {
      type: 'health_certificate',
      label: 'Giấy Khám Sức Khỏe',
      icon: ClipboardList,
      note: 'Hiệu lực 6 tháng kể từ ngày cấp',
    },
    {
      type: 'safety_card',
      label: 'Chứng chỉ An toàn LĐ',
      icon: Shield,
      note: 'Thẻ ATLĐ do đơn vị cấp',
    },
    {
      type: 'safety_commitment',
      label: 'Cam Kết An Toàn',
      icon: FileText,
      note: 'Biên bản cam kết lao động',
    },
  ];

  const qrValue = `${worker.mnv} - ${worker.full_name}${
    worker.vehicle_plate ? ` - ${formatVehiclePlate(worker.vehicle_plate)}` : ''
  }`;

  return (
    <div className="flex flex-col min-h-full">
      {/* Sub-header Bar (WorkerDetail.dc.html) */}
      <div
        style={{
          minHeight: '56px',
          background: '#ffffff',
          borderBottom: '1px solid #e3e8ef',
          padding: '12px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/workers"
            style={{ fontSize: '13px', color: '#1e3a8a', fontWeight: 700 }}
            className="no-underline hover:underline"
          >
            ← Quay lại danh sách
          </Link>
          <span style={{ color: '#c5cedb' }}>/</span>
          <span style={{ fontSize: '13px', color: '#5b6577' }}>Hồ sơ công nhân</span>
          <span style={{ color: '#c5cedb' }}>/</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f1b33' }}>
            {worker.full_name} ({worker.mnv})
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => window.open(`/workers/${worker.id}/print`, '_blank')}
            className="btn-secondary"
          >
            <Printer className="w-4 h-4" />
            <span>In hồ sơ</span>
          </button>
          <Link href="/cards" className="no-underline">
            <button type="button" className="btn-secondary">
              <CreditCard className="w-4 h-4" />
              <span>In thẻ nhựa</span>
            </button>
          </Link>
          <Link href={`/workers/${worker.id}/edit`} className="no-underline">
            <button type="button" className="btn-primary">
              <Edit className="w-4 h-4" />
              <span>Chỉnh sửa thông tin</span>
            </button>
          </Link>
        </div>
      </div>

      {/* CONTENT AREA (2 Columns Layout) */}
      <div
        style={{ padding: '24px 28px' }}
        className="max-w-[1360px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start"
      >
        {/* LEFT PROFILE CARD */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e3e8ef',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(15,27,51,0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* Portrait Box */}
          <div
            style={{
              position: 'relative',
              width: '140px',
              height: '175px',
              borderRadius: '10px',
              background: '#eef2fb',
              border: '2px solid #c9d4f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            {worker.portrait_url && !imgError ? (
              <img
                src={worker.portrait_url}
                alt={worker.full_name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <>
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: '#1e3a8a',
                    color: '#ffffff',
                    fontSize: '26px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                  }}
                >
                  {getInitials(worker.full_name)}
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#1e3a8a' }}>
                  Ảnh 3x4 tiêu chuẩn
                </span>
              </>
            )}

            <Link
              href={`/workers/${worker.id}/edit`}
              title="Thay đổi ảnh"
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#1e3a8a',
                color: '#ffffff',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              <Camera className="w-4 h-4" />
            </Link>
          </div>

          {/* Name & Badges */}
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f1b33' }}>
            {worker.full_name}
          </h2>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#5b6577',
              marginTop: '4px',
            }}
          >
            Mã nhân viên:{' '}
            <span style={{ color: '#1e3a8a', fontWeight: 700 }}>{worker.mnv}</span>
          </div>

          <div className="flex gap-1.5 my-3.5 flex-wrap justify-center">
            {worker.work_status === 'inactive' ? (
              <span
                className="scmp-badge"
                style={{ background: '#fdecec', color: '#b4141a' }}
              >
                Nghỉ việc
              </span>
            ) : (
              <span
                className="scmp-badge"
                style={{ background: '#e6f5ee', color: '#047857' }}
              >
                Đang làm việc
              </span>
            )}
            <span
              className="scmp-badge"
              style={{ background: '#eef2fb', color: '#1e3a8a' }}
            >
              {worker.card_status === 'issued'
                ? 'Đã cấp thẻ'
                : worker.card_status === 'approved'
                ? 'Chờ in thẻ'
                : worker.card_status === 'pending'
                ? 'Chờ duyệt thẻ'
                : 'Chưa cấp thẻ'}
            </span>
          </div>

          {/* Card Validity Visual Bar */}
          <div
            style={{
              width: '100%',
              background: '#f7f9fc',
              border: '1px solid #e3e8ef',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            <div
              className="flex justify-between mb-1.5"
              style={{ fontSize: '12px', fontWeight: 600 }}
            >
              <span style={{ color: '#5b6577' }}>Thời hạn thẻ ra vào</span>
              <span
                style={{
                  color: diffDays <= 0 ? '#b4141a' : diffDays <= 30 ? '#92400e' : '#047857',
                  fontWeight: 700,
                }}
              >
                {diffDays > 0 ? `Còn ${diffDays} ngày` : 'Đã hết hạn'}
              </span>
            </div>
            <div
              style={{
                height: '6px',
                background: '#e3e8ef',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${validityPct}%`,
                  height: '100%',
                  background:
                    diffDays <= 0 ? '#b4141a' : diffDays <= 30 ? '#d97706' : '#047857',
                }}
              />
            </div>
            <div
              className="flex justify-between mt-1.5"
              style={{ fontSize: '11px', color: '#5b6577' }}
            >
              <span>Cấp: {startDate.toLocaleDateString('vi-VN')}</span>
              <span>Hết hạn: {expiryDate.toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          {/* QR Code Card representation */}
          <div
            style={{
              width: '100%',
              border: '1px solid #e3e8ef',
              borderRadius: '8px',
              padding: '14px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              textAlign: 'left',
            }}
          >
            <div className="p-1.5 bg-white border border-[#e3e8ef] rounded shrink-0">
              <QRCode value={qrValue} size={56} />
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f1b33' }}>
                Mã quét cổng Barrier
              </div>
              <div
                style={{ fontSize: '11px', color: '#5b6577', marginTop: '2px' }}
              >
                Dùng quét qua cổng trạm gác &amp; kiểm tra định danh
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#1e3a8a',
                  marginTop: '4px',
                }}
                className="truncate"
              >
                {worker.mnv}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT INFORMATION TABS & DATA */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e3e8ef',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(15,27,51,0.05)',
            overflow: 'hidden',
          }}
        >
          {/* Tab Bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e3e8ef',
              padding: '0 20px',
              background: '#ffffff',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              style={{
                height: '44px',
                padding: '0 16px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: activeTab === 'info' ? 700 : 600,
                color: activeTab === 'info' ? '#1e3a8a' : '#5b6577',
                borderBottom:
                  activeTab === 'info' ? '2px solid #1e3a8a' : '2px solid transparent',
              }}
            >
              Thông tin nhân sự
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              style={{
                height: '44px',
                padding: '0 16px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: activeTab === 'docs' ? 700 : 600,
                color: activeTab === 'docs' ? '#1e3a8a' : '#5b6577',
                borderBottom:
                  activeTab === 'docs' ? '2px solid #1e3a8a' : '2px solid transparent',
              }}
            >
              Giấy tờ &amp; Hồ sơ đính kèm ({documents.length}/{DOC_TYPES.length})
            </button>
          </div>

          {/* Tab Body */}
          <div style={{ padding: '24px' }}>
            {activeTab === 'info' ? (
              <>
                {/* Section 1: Personal Info */}
                <div style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#1e3a8a',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        width: '3px',
                        height: '14px',
                        background: '#1e3a8a',
                        borderRadius: '2px',
                      }}
                    />
                    Thông tin định danh cá nhân
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div className="field-box">
                      <div className="field-label">Họ và tên</div>
                      <div className="field-value">{worker.full_name}</div>
                    </div>
                    <div className="field-box">
                      <div className="field-label">Số CCCD / Định danh</div>
                      <div className="field-value font-mono">{worker.cccd || '—'}</div>
                    </div>
                    <div className="field-box">
                      <div className="field-label">Ngày sinh</div>
                      <div className="field-value">
                        {worker.date_of_birth
                          ? new Date(worker.date_of_birth).toLocaleDateString('vi-VN')
                          : '—'}
                      </div>
                    </div>
                    <div className="field-box">
                      <div className="field-label">Số điện thoại liên hệ</div>
                      <div className="field-value">{worker.phone || '—'}</div>
                    </div>
                    <div className="field-box sm:col-span-2">
                      <div className="field-label">Địa chỉ thường trú</div>
                      <div className="field-value">{worker.address || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Construction Assignment */}
                <div style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#1e3a8a',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        width: '3px',
                        height: '14px',
                        background: '#1e3a8a',
                        borderRadius: '2px',
                      }}
                    />
                    Thông tin phân công công trường &amp; Phương tiện
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div className="field-box">
                      <div className="field-label">Khu vực thi công chính</div>
                      <div className="field-value" style={{ color: '#1e3a8a' }}>
                        {worker.area || '—'}
                      </div>
                    </div>
                    <div className="field-box">
                      <div className="field-label">Tổ đội thi công</div>
                      <div className="field-value">{worker.team || '—'}</div>
                    </div>
                    <div className="field-box">
                      <div className="field-label">Chức danh / Vị trí</div>
                      <div className="field-value">{worker.position || 'Công nhân'}</div>
                    </div>
                    <div className="field-box">
                      <div className="field-label">Ngày vào công trường</div>
                      <div className="field-value">
                        {startDate.toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div className="field-box">
                      <div className="field-label">Biển số xe đăng ký</div>
                      <div className="field-value font-mono">
                        {worker.vehicle_plate
                          ? formatVehiclePlate(worker.vehicle_plate)
                          : 'Không đăng ký'}
                      </div>
                    </div>
                    <div className="field-box">
                      <div className="field-label">Loại phương tiện</div>
                      <div className="field-value">{worker.vehicle_type || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Safety & Documents */}
                <div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#1e3a8a',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        style={{
                          width: '3px',
                          height: '14px',
                          background: '#1e3a8a',
                          borderRadius: '2px',
                        }}
                      />
                      <span>Hồ sơ An toàn &amp; Giấy tờ lưu trữ</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('docs')}
                      style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a' }}
                      className="hover:underline"
                    >
                      Quản lý tài liệu →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {DOC_TYPES.map((docItem) => {
                      const existing = getDoc(docItem.type);
                      const Icon = docItem.icon;
                      return (
                        <div
                          key={docItem.type}
                          onClick={() => setActiveTab('docs')}
                          style={{
                            border: '1px solid #e3e8ef',
                            borderRadius: '8px',
                            padding: '12px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                          className="hover:border-[#1e3a8a] transition-colors"
                        >
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              background: existing ? '#e6f5ee' : '#fdecec',
                              color: existing ? '#047857' : '#b4141a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#0f1b33',
                              }}
                              className="truncate"
                            >
                              {docItem.label}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: existing ? '#047857' : '#b4141a',
                                fontWeight: 600,
                              }}
                            >
                              {existing ? '✓ Đã nộp hồ sơ' : '✕ Chưa nộp'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#0f1b33]">
                      Danh mục giấy tờ bắt buộc ({documents.length}/{DOC_TYPES.length})
                    </h3>
                    <p className="text-xs text-[#5b6577]">
                      Tải lên hoặc cập nhật bản scan / ảnh chụp giấy tờ của công nhân
                    </p>
                  </div>
                  {documents.length >= DOC_TYPES.length && (
                    <span
                      className="scmp-badge"
                      style={{ background: '#e6f5ee', color: '#047857' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đủ hồ sơ
                    </span>
                  )}
                </div>

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
                        onSuccess={() => fetchData(true)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
