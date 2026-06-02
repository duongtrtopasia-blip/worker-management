'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, CreditCard, FolderOpen, UploadCloud, Settings, LogOut, Bell, ChevronRight } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';

import { ClipboardList } from 'lucide-react';

const baseMenuItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Công nhân', href: '/workers', icon: Users },
  { name: 'Thẻ ra vào', href: '/cards', icon: CreditCard },
  { name: 'Hồ sơ tài liệu', href: '/documents', icon: FolderOpen },
  { name: 'Import Excel', href: '/import', icon: UploadCloud },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = React.useState('admin');
  const [username, setUsername] = React.useState('Admin');

  React.useEffect(() => {
    const roleMatch = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
    if (roleMatch) setUserRole(roleMatch[2]);
    
    const userMatch = document.cookie.match(new RegExp('(^| )username=([^;]+)'));
    if (userMatch) setUsername(userMatch[2]);
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  const menuItems = [...baseMenuItems];
  if (userRole === 'admin') {
    menuItems.push({ name: 'Lịch sử thao tác', href: '/audit-logs', icon: ClipboardList });
  }

  return (
    <div className="flex h-screen font-sans" style={{ backgroundColor: '#f0f4f8' }}>

      {/* ===== SIDEBAR ===== */}
      <aside className="w-64 hidden md:flex flex-col flex-shrink-0 shadow-2xl" style={{
        background: 'linear-gradient(160deg, #1e3a8a 0%, #1a2f6e 55%, #7a0525 100%)'
      }}>

        {/* Logo Area */}
        <div className="h-16 flex items-center px-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-3 w-full">
            {/* Two logos side by side */}
            <img src="/vingroup_logo.svg" alt="Vingroup" className="h-6 w-auto object-contain brightness-0 invert shrink-0" />
            <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <img src="/logo.svg" alt="VINCONS" className="h-6 w-auto object-contain brightness-0 invert shrink-0" />
          </div>
        </div>

        {/* App Title */}
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <p className="text-[9px] font-semibold tracking-[0.15em] uppercase" style={{ color: 'rgba(253,239,3,0.9)' }}>
            Hệ thống quản lý
          </p>
          <p className="text-sm font-bold text-white mt-0.5 leading-tight">
            Công Nhân Công Trường
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                style={isActive ? { backgroundColor: 'rgba(253,239,3,0.18)', borderLeft: '3px solid #fdef03' } : { borderLeft: '3px solid transparent' }}
                >
                  <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-yellow-300' : 'text-white/50 group-hover:text-white/80'}`} />
                  <span>{item.name}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-yellow-300/70" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 space-y-1 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Link href="/settings">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium">
              <Settings className="w-4 h-4" />
              <span>Cài đặt</span>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-16 bg-white flex items-center justify-between px-5 sm:px-6 shrink-0"
          style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06), 0 2px 8px rgba(30,58,138,0.06)' }}>

          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2">
            <img src="/logo.svg" alt="VINCONS" className="h-7 w-auto object-contain" />
            <span className="text-xs font-bold text-brand-blue tracking-tight">Quản Lý Công Nhân</span>
          </div>

          {/* Breadcrumb / page title placeholder */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #1e3a8a, #970731)' }} />
            <span className="text-sm font-semibold text-gray-700">Khu DLND Mỹ Lâm – Tuyên Quang</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-red border border-white" />
            </button>
            <div className="hidden sm:block h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm uppercase"
                style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
                {username[0]}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-none capitalize">{username}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{userRole === 'admin' ? 'Quản trị viên' : 'Người dùng'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
