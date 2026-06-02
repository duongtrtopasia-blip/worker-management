'use client';

import React from 'react';
import { Users, CreditCard, AlertTriangle, FileWarning, TrendingUp, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const PIE_COLORS = ['#1e3a8a', '#e31c23'];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    missingDocs: 0,
    expiring: 0,
    pieData: [{ name: 'Đủ hồ sơ', value: 0 }, { name: 'Thiếu hồ sơ', value: 0 }],
    barData: [] as any[],
    expiringCards: [] as any[]
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.from('workers').select('*');
      if (error || !data) {
        setLoading(false);
        return;
      }
      
      const total = data.length;
      const missingDocsList = data.filter(w => !w.portrait_url);
      const missingDocs = missingDocsList.length;
      
      const pieData = [
        { name: 'Đủ hồ sơ', value: total - missingDocs },
        { name: 'Thiếu hồ sơ', value: missingDocs },
      ];
      
      const areaMap = new Map();
      data.forEach(w => {
        const area = w.area || 'Khác';
        areaMap.set(area, (areaMap.get(area) || 0) + 1);
      });
      const barData = Array.from(areaMap.entries()).map(([name, count]) => ({
        name,
        'Công nhân': count
      })).sort((a, b) => b['Công nhân'] - a['Công nhân']).slice(0, 5);
      
      const expiringCards: any[] = [];
      const now = new Date();
      data.forEach(w => {
        const startDate = new Date(w.start_date || w.created_at);
        const expiryDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 30 && diffDays >= 0) {
          expiringCards.push({
            name: w.full_name,
            mnv: w.mnv,
            expiry: expiryDate.toLocaleDateString('vi-VN'),
            daysLeft: diffDays
          });
        }
      });
      expiringCards.sort((a, b) => a.daysLeft - b.daysLeft);
      
      setStats({
        total,
        missingDocs,
        expiring: expiringCards.length,
        pieData,
        barData,
        expiringCards
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <div className="p-5 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight">Tổng quan hệ thống</h1>
          <p className="text-sm text-gray-500 mt-0.5">Khu DLND Mỹ Lâm – Tuyên Quang</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-2 rounded-full shadow-sm border">
          <Clock className="w-3.5 h-3.5" />
          <span>Cập nhật: hôm nay</span>
        </div>
      </div>

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng công nhân"
          value={stats.total.toString()}
          sub="Đã đăng ký"
          icon={Users}
          accent="#1e3a8a"
          bg="rgba(30,58,138,0.07)"
        />
        <StatCard
          title="Thẻ sắp hết hạn"
          value={stats.expiring.toString()}
          sub="Trong 30 ngày"
          icon={CreditCard}
          accent="#f59e0b"
          bg="rgba(245,158,11,0.08)"
        />
        <StatCard
          title="Thiếu hồ sơ"
          value={stats.missingDocs.toString()}
          sub="Chưa có ảnh"
          icon={AlertTriangle}
          accent="#e31c23"
          bg="rgba(227,28,35,0.07)"
        />
        <StatCard
          title="Tài liệu hết hạn"
          value="0"
          sub="Quá hạn"
          icon={FileWarning}
          accent="#970731"
          bg="rgba(151,7,49,0.07)"
        />
      </div>

      {/* ===== CHARTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Bar chart - wider */}
        <div className="lg:col-span-3 bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #1e3a8a, #970731)' }} />
            <h3 className="font-semibold text-gray-800">Phân bổ công nhân theo khu vực</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.barData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  cursor={{ fill: 'rgba(30,58,138,0.04)' }}
                />
                <Bar dataKey="Công nhân" radius={[6, 6, 0, 0]}
                  fill="url(#barGradient)"
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3a8a" />
                    <stop offset="100%" stopColor="#3b5fc0" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #1e3a8a, #970731)' }} />
            <h3 className="font-semibold text-gray-800">Tỷ lệ hồ sơ</h3>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value" stroke="none">
                  {stats.pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#1e3a8a' }} />
              Đủ hồ sơ <span className="font-semibold text-gray-800 ml-1">{stats.pieData[0].value}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#e31c23' }} />
              Thiếu <span className="font-semibold text-gray-800 ml-1">{stats.pieData[1].value}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ALERT TABLES ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Expiring cards */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: '#f0f0f0' }}>
            <div className="p-1.5 rounded-md" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
              <CreditCard className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Thẻ sắp hết hạn</h3>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full text-amber-700 bg-amber-100">{stats.expiring}</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#f9f9f9' }}>
            {stats.expiringCards.length > 0 ? stats.expiringCards.map((card, i) => (
              <div key={i} className="flex items-center px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b5fc0)' }}>
                  {card.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{card.name}</p>
                  <p className="text-xs text-gray-400">MNV: {card.mnv}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-600">{card.expiry}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    card.daysLeft <= 14 ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100'
                  }`}>
                    Còn {card.daysLeft} ngày
                  </span>
                </div>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Không có thẻ nào sắp hết hạn.</div>
            )}
          </div>
        </div>

        {/* Missing docs */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: '#f0f0f0' }}>
            <div className="p-1.5 rounded-md" style={{ backgroundColor: 'rgba(227,28,35,0.08)' }}>
              <FileWarning className="w-4 h-4 text-brand-red" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Tài liệu cần bổ sung gấp</h3>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full text-red-700 bg-red-100">{stats.missingDocs}</span>
          </div>
          <div className="px-5 py-8 flex flex-col items-center justify-center text-center">
            <FileWarning className="w-10 h-10 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Bạn đang có {stats.missingDocs} công nhân chưa cập nhật ảnh chân dung.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, accent, bg }: any) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 stat-card-hover cursor-default">
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: bg }}>
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
        <TrendingUp className="w-3.5 h-3.5 text-gray-300" />
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-0.5">{title}</p>
        <p className="text-[11px] mt-1.5 font-semibold" style={{ color: accent }}>{sub}</p>
      </div>
    </div>
  );
}
