'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, CreditCard, FolderOpen, UploadCloud, Settings, LogOut, Bell, ChevronRight } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { AppNotification, getNotificationsAction } from '@/app/actions/notification';

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

  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = React.useState(false);
  const [lastRead, setLastRead] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchNotifs = async () => {
      const data = await getNotificationsAction();
      setNotifications(data);
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    const savedTime = localStorage.getItem('last_read_notif');
    if (savedTime) setLastRead(savedTime);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !lastRead || new Date(n.created_at) > new Date(lastRead)).length;

  const handleOpenNotifs = () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) {
      const now = new Date().toISOString();
      setLastRead(now);
      localStorage.setItem('last_read_notif', now);
    }
  };

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
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 pb-[72px] md:pb-0 relative">

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
            
            {/* Notifications */}
            <div className="relative">
              <button onClick={handleOpenNotifs} className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5 text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-brand-red border border-white text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifs && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)}></div>
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800">Thông báo</h3>
                      {unreadCount > 0 && <span className="text-xs text-brand-blue font-medium">{unreadCount} mới</span>}
                    </div>
                    <div className="max-h-[350px] overflow-y-auto overscroll-contain">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">Không có thông báo nào</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} onClick={() => { setShowNotifs(false); if(n.link) router.push(n.link); }} className="px-4 py-3 border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer transition-colors group">
                            <p className="font-medium text-sm text-gray-800 group-hover:text-brand-blue">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('vi-VN')}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

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

        {/* ===== MOBILE BOTTOM NAVIGATION ===== */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white border-t border-gray-200 flex justify-around items-center px-1 z-50 pb-safe"
          style={{ boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}>
          {menuItems.slice(0, 4).map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-full h-full gap-1.5 pt-1">
                <item.icon className={`w-6 h-6 transition-all ${isActive ? 'text-brand-red scale-110 drop-shadow-md' : 'text-gray-400'}`} />
                <span className={`text-[10px] font-medium tracking-tight transition-colors ${isActive ? 'text-brand-blue font-bold' : 'text-gray-500'}`}>
                  {item.name === 'Dashboard' ? 'Trang chủ' : item.name === 'Hồ sơ tài liệu' ? 'Hồ sơ' : item.name === 'Công nhân' ? 'Nhân sự' : item.name}
                </span>
              </Link>
            );
          })}
          <Link href="/settings" className="flex flex-col items-center justify-center w-full h-full gap-1.5 pt-1">
             <Settings className={`w-6 h-6 transition-all ${pathname.startsWith('/settings') ? 'text-brand-red scale-110 drop-shadow-md' : 'text-gray-400'}`} />
             <span className={`text-[10px] font-medium tracking-tight transition-colors ${pathname.startsWith('/settings') ? 'text-brand-blue font-bold' : 'text-gray-500'}`}>
               Cài đặt
             </span>
          </Link>
        </nav>
      </main>
    </div>
  );
}
