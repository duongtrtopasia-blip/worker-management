'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { loginAction } from '@/app/actions/auth';
import { Eye, EyeOff, LogIn } from 'lucide-react';

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
    } catch (error: any) {
      toast.error('Có lỗi xảy ra khi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans" style={{ background: 'linear-gradient(135deg, #0f1f5c 0%, #1e3a8a 45%, #970731 100%)' }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }} />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }} />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img src="/vincons_logo.png" alt="VINCONS" className="h-10 w-auto object-contain brightness-0 invert" />
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Hệ thống quản lý
            </h2>
            <h2 className="text-4xl font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>
              công nhân & thẻ ra vào
            </h2>
          </div>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Quản lý toàn diện hồ sơ công nhân, phát hành thẻ QR và kiểm soát ra vào công trình một cách hiệu quả.
          </p>

          {/* Feature list */}
          <div className="space-y-3 pt-2">
            {[
              'Quản lý hồ sơ công nhân',
              'Phát hành thẻ QR tự động',
              'Kiểm soát ra vào theo thời gian thực',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                <span className="text-white/70 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer brand */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="h-px flex-1 bg-white/20" />
          <span className="text-white/30 text-xs uppercase tracking-widest">VINCONS</span>
          <div className="h-px flex-1 bg-white/20" />
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white/5 backdrop-blur-sm">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Card header stripe */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #970731 100%)' }} />

            <div className="p-8 lg:p-10">
              {/* Mobile logo */}
              <div className="lg:hidden text-center mb-8">
                <img src="/vincons_logo.png" alt="VINCONS" className="h-10 w-auto object-contain mx-auto" />
              </div>

              {/* Heading */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Đăng nhập</h1>
                <p className="text-gray-500 text-sm">Chào mừng trở lại, Administrator</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Tài khoản
                  </label>
                  <input
                    id="username"
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Nhập tên đăng nhập..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white text-sm font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  style={{
                    background: loading
                      ? '#9ca3af'
                      : 'linear-gradient(90deg, #1e3a8a 0%, #970731 100%)',
                    boxShadow: loading ? 'none' : '0 4px 15px rgba(30, 58, 138, 0.35)',
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang xác thực...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Đăng nhập
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Card footer */}
            <div className="px-8 lg:px-10 py-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Vui lòng liên hệ bộ phận <span className="font-semibold text-gray-500">IT</span> để được cấp tài khoản hệ thống.
              </p>
            </div>
          </div>

          {/* Bottom text */}
          <p className="text-center text-white/30 text-xs mt-6">
            © 2026 HSE Team Vincons
          </p>
        </div>
      </div>
    </div>
  );
}
