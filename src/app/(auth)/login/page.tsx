'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { loginAction } from '@/app/actions/auth';
import { Eye, EyeOff, ArrowRight, Users, Calendar, Shield, Smartphone } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await loginAction(username, password);

      if (res.success) {
        toast.success('Đăng nhập thành công!');
        router.push('/');
        router.refresh();
      } else {
        toast.error(res.error || 'Mật khẩu không đúng');
      }
    } catch {
      toast.error('Có lỗi xảy ra khi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white">
      {/* LEFT BRAND HERO PANEL (60%) */}
      <div
        className="hidden lg:flex flex-col justify-between relative"
        style={{
          flex: 1.2,
          background: '#16296a',
          padding: '64px 56px',
          color: '#ffffff',
        }}
      >
        {/* Top Brand Header */}
        <div>
          <div className="flex items-center gap-3.5 mb-8">
            <div
              style={{
                background: '#ffffff',
                padding: '6px 12px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '16px',
                  color: '#1e3a8a',
                  letterSpacing: '-0.5px',
                }}
              >
                VINCONS
              </span>
            </div>
            <div style={{ width: '1px', height: '24px', background: '#2a3f86' }} />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#fdef03',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              SCMP SYSTEM
            </span>
          </div>

          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#fdef03',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '8px',
            }}
          >
            Dự án trọng điểm Vincons
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '34px',
              fontWeight: 800,
              lineHeight: 1.25,
              color: '#ffffff',
              maxWidth: '520px',
              letterSpacing: '-0.01em',
            }}
          >
            Khu Du Lịch Nghỉ Dưỡng Suối Khoáng Mỹ Lâm
          </h1>
          <p
            style={{
              margin: '12px 0 0',
              fontSize: '15px',
              color: '#b8c3e6',
              maxWidth: '480px',
              lineHeight: 1.5,
            }}
          >
            Hệ thống quản lý định danh công nhân, cấp thẻ ra vào barrier tự động, kiểm soát an toàn lao động và ăn ca.
          </p>
        </div>

        {/* Highlights Features */}
        <div className="py-6 space-y-5">
          <div className="flex items-start gap-3">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(253,239,3,0.15)',
                color: '#fdef03',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                Quản lý tập trung nhân sự công trường
              </div>
              <div style={{ fontSize: '13px', color: '#b8c3e6', marginTop: '2px' }}>
                Kiểm soát đầy đủ hợp đồng, chứng chỉ an toàn, số CCCD và phân tổ thi công.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(253,239,3,0.15)',
                color: '#fdef03',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                Tự động cảnh báo hạn thẻ 30 ngày
              </div>
              <div style={{ fontSize: '13px', color: '#b8c3e6', marginTop: '2px' }}>
                Nhắc nhở gia hạn thẻ và bổ sung hồ sơ định kỳ, giảm thiểu gián đoạn thi công.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(253,239,3,0.15)',
                color: '#fdef03',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                Bảo mật &amp; Quản trị phân quyền nghiêm ngặt
              </div>
              <div style={{ fontSize: '13px', color: '#b8c3e6', marginTop: '2px' }}>
                Lưu vết lịch sử thao tác (Audit Log), chỉ tài khoản được phê duyệt mới được truy cập.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Meta */}
        <div
          style={{
            borderTop: '1px solid #2a3f86',
            paddingTop: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#7e95cf',
          }}
        >
          <span>Bản quyền © 2026 Vincons Construction JSC</span>
          <span>Phiên bản v2.4 (Cloudflare Native)</span>
        </div>
      </div>

      {/* RIGHT LOGIN CARD (40%) */}
      <div
        className="flex-1 flex flex-col justify-center bg-white"
        style={{ padding: '48px 32px' }}
      >
        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div
              style={{
                background: '#16296a',
                padding: '5px 10px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#ffffff' }}>VINCONS</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a' }}>
              SCMP SYSTEM – Mỹ Lâm
            </span>
          </div>

          {/* Card Header */}
          <div style={{ marginBottom: '32px' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#eef2fb',
                color: '#1e3a8a',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px',
              }}
            >
              Đăng nhập an toàn
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '26px',
                fontWeight: 800,
                color: '#0f1b33',
                letterSpacing: '-0.01em',
              }}
            >
              Chào mừng trở lại
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#5b6577' }}>
              Vui lòng nhập tài khoản cán bộ công trường
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-[18px]">
            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Tên đăng nhập hoặc Email
              </label>
              <input
                id="username"
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  border: '1px solid #8592a4',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#ffffff',
                  color: '#0f1b33',
                }}
                className="outline-none focus:!border-[#1e3a8a] focus:ring-[3px] focus:ring-[#c9d4f0] transition-all"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="password"
                  style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}
                >
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 44px 0 14px',
                    border: '1px solid #8592a4',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#ffffff',
                    color: '#0f1b33',
                  }}
                  className="outline-none focus:!border-[#1e3a8a] focus:ring-[3px] focus:ring-[#c9d4f0] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5b6577] hover:text-[#0f1b33] transition-colors p-1"
                  tabIndex={-1}
                  aria-label="Hiện/ẩn mật khẩu"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  style={{ width: '16px', height: '16px', accentColor: '#1e3a8a' }}
                />
                <span>Ghi nhớ đăng nhập trên thiết bị này</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '8px',
                border: 'none',
                background: loading ? '#8592a4' : '#1e3a8a',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                boxShadow: loading ? 'none' : '0 2px 6px rgba(30,58,138,0.3)',
                marginTop: '8px',
              }}
              className="flex items-center justify-center gap-2 hover:!bg-[#192f72] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập hệ thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Support Notice Box */}
          <div
            style={{
              marginTop: '36px',
              padding: '14px 16px',
              borderRadius: '8px',
              background: '#f7f9fc',
              border: '1px solid #e3e8ef',
              fontSize: '12px',
              color: '#5b6577',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 700, color: '#0f1b33' }}>Hỗ trợ cấp tài khoản:</span> Liên hệ
            Ban Chỉ Huy Công Trường Mỹ Lâm hoặc Phòng An toàn &amp; CNTT.
          </div>

          {/* Android APK Download Button */}
          <a
            href="/SCMP-Vincons.apk"
            download="SCMP-Vincons.apk"
            style={{
              marginTop: '12px',
              padding: '11px 16px',
              borderRadius: '8px',
              background: '#eef2fb',
              border: '1px solid #c9d4f0',
              fontSize: '13px',
              fontWeight: 700,
              color: '#1e3a8a',
              textDecoration: 'none',
            }}
            className="flex items-center justify-center gap-2 hover:bg-[#e1e8f9] transition-colors"
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Tải ứng dụng Android (.APK)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
