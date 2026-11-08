'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Clock, AlertTriangle, Car, Download, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const AREA_BAR_COLORS = ['#1e3a8a', '#2f4ba0', '#4865bd', '#7189d4', '#9bb0ea'];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    missingDocs: 0,
    expiring: 0,
    vehicles: 0,
    areaData: [] as { name: string; count: number; pct: number }[],
    expiringCards: [] as {
      id: string;
      name: string;
      mnv: string;
      team: string;
      expiry: string;
      daysLeft: number;
    }[],
    missingPortraitWorkers: [] as {
      id: string;
      name: string;
      mnv: string;
      team: string;
      missingLabel: string;
    }[],
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: totalCount } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true });

      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data: chunk, error } = await supabase
          .from('workers')
          .select('id, area, team, portrait_url, start_date, created_at, mnv, full_name, vehicle_plate, cccd')
          .range(from, from + step - 1);
        if (error || !chunk || chunk.length === 0) break;
        allData = allData.concat(chunk);
        if (chunk.length < step) break;
        from += step;
      }

      const data = allData;
      if (!data) {
        setLoading(false);
        return;
      }

      const total = totalCount ?? data.length;
      const missingDocsList = data.filter((w) => !w.portrait_url || !w.cccd);
      const missingDocs = missingDocsList.length;
      const vehicles = data.filter((w) => w.vehicle_plate && w.vehicle_plate.trim() !== '').length;

      const areaMap = new Map<string, number>();
      data.forEach((w) => {
        const area = w.area || 'Khu vực khác / Nhà thầu phụ';
        areaMap.set(area, (areaMap.get(area) || 0) + 1);
      });

      const areaData = Array.from(areaMap.entries())
        .map(([name, count]) => ({
          name,
          count,
          pct: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const expiringCards: any[] = [];
      const now = new Date();
      data.forEach((w) => {
        const startDate = new Date(w.start_date || w.created_at);
        const expiryDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30 && diffDays >= 0) {
          expiringCards.push({
            id: w.id,
            name: w.full_name,
            mnv: w.mnv,
            team: w.team || 'Chưa phân tổ',
            expiry: expiryDate.toLocaleDateString('vi-VN'),
            daysLeft: diffDays,
          });
        }
      });
      expiringCards.sort((a, b) => a.daysLeft - b.daysLeft);

      const missingPortraitWorkers = missingDocsList.slice(0, 5).map((w) => ({
        id: w.id,
        name: w.full_name,
        mnv: w.mnv,
        team: w.team || 'Chưa phân tổ',
        missingLabel: !w.portrait_url ? 'Chưa có ảnh thẻ' : 'Thiếu CCCD',
      }));

      setStats({
        total,
        missingDocs,
        expiring: expiringCards.length,
        vehicles,
        areaData,
        expiringCards,
        missingPortraitWorkers,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const validCount = Math.max(0, stats.total - stats.missingDocs);
  const validPct = stats.total > 0 ? Math.round((validCount / stats.total) * 100) : 100;
  const circleCircumference = 2 * Math.PI * 50; // 314.16
  const strokeDashoffset = circleCircumference * (1 - validPct / 100);

  const handleExportApproval = async () => {
    const toastId = toast.loading('Đang xuất báo cáo tổng hợp...');
    try {
      const res = await fetch('/api/export-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerIds: [] }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BaoCao_SCMP_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Đã xuất báo cáo Excel thành công!', { id: toastId });
    } catch {
      toast.error('Có lỗi khi xuất báo cáo', { id: toastId });
    }
  };

  return (
    <div style={{ padding: '24px 28px' }} className="max-w-[1360px] mx-auto">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 700,
              color: '#0f1b33',
              letterSpacing: '-0.01em',
            }}
          >
            Tổng quan hệ thống
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5b6577' }}>
            Dữ liệu nhân sự và thẻ ra vào cập nhật theo thời gian thực hôm nay
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={handleExportApproval} className="btn-secondary">
            <Download className="w-4 h-4" />
            <span>Xuất báo cáo</span>
          </button>
          <Link href="/workers/new" className="no-underline">
            <button className="btn-primary">
              <Plus className="w-4 h-4" />
              <span>Thêm công nhân</span>
            </button>
          </Link>
        </div>
      </div>

      {/* KPI ROW (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total */}
        <Link href="/workers" className="no-underline">
          <div className="kpi-card h-full">
            <div className="flex justify-between items-start">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Tổng công nhân
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#0f1b33',
                    margin: '8px 0 2px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {loading ? '—' : stats.total.toLocaleString('vi-VN')}
                </div>
                <div style={{ fontSize: '12px', color: '#5b6577' }}>Đã cấp thẻ ra vào</div>
              </div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#eef2fb',
                  color: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
        </Link>

        {/* Expiring (30 days) */}
        <Link href="/cards" className="no-underline">
          <div className="kpi-card h-full" style={{ borderLeft: '4px solid #d97706' }}>
            <div className="flex justify-between items-start">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Thẻ sắp hết hạn
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#92400e',
                    margin: '8px 0 2px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {loading ? '—' : stats.expiring.toLocaleString('vi-VN')}
                </div>
                <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
                  Hết hạn trong 30 ngày
                </div>
              </div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#fdf3dc',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>
        </Link>

        {/* Missing Docs */}
        <Link href="/documents" className="no-underline">
          <div className="kpi-card h-full" style={{ borderLeft: '4px solid #e31c23' }}>
            <div className="flex justify-between items-start">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Thiếu hồ sơ
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#b4141a',
                    margin: '8px 0 2px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {loading ? '—' : stats.missingDocs.toLocaleString('vi-VN')}
                </div>
                <div style={{ fontSize: '12px', color: '#b4141a', fontWeight: 600 }}>
                  Chưa chụp ảnh / thiếu CCCD
                </div>
              </div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#fdecec',
                  color: '#b4141a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </Link>

        {/* Registered Vehicles */}
        <Link href="/vehicle-search" className="no-underline">
          <div className="kpi-card h-full">
            <div className="flex justify-between items-start">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Xe đã đăng ký
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#0f1b33',
                    margin: '8px 0 2px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {loading ? '—' : stats.vehicles.toLocaleString('vi-VN')}
                </div>
                <div style={{ fontSize: '12px', color: '#5b6577' }}>
                  Xe máy &amp; xe tải công trường
                </div>
              </div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#eef1f5',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Car className="w-5 h-5" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* CHARTS & SUMMARY ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Area Bar Chart representation */}
        <div
          className="lg:col-span-2"
          style={{
            background: '#ffffff',
            border: '1px solid #e3e8ef',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f1b33' }}>
                Phân bổ công nhân theo khu vực thi công
              </div>
              <div style={{ fontSize: '12px', color: '#5b6577', marginTop: '2px' }}>
                5 phân khu trọng điểm
              </div>
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1e3a8a',
                background: '#eef2fb',
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              Toàn dự án
            </span>
          </div>

          <div className="flex flex-col gap-3 py-2">
            {loading ? (
              <div className="py-12 text-center text-sm text-[#5b6577]">Đang tải biểu đồ phân bổ...</div>
            ) : stats.areaData.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#5b6577]">Chưa có dữ liệu khu vực</div>
            ) : (
              stats.areaData.map((area, idx) => (
                <div key={area.name}>
                  <div
                    className="flex justify-between mb-1"
                    style={{ fontSize: '13px', fontWeight: 600 }}
                  >
                    <span className="text-[#0f1b33]">{area.name}</span>
                    <span style={{ color: '#1e3a8a', fontWeight: 700 }}>
                      {area.count.toLocaleString('vi-VN')} người ({area.pct}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '10px',
                      background: '#eef1f5',
                      borderRadius: '5px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(4, area.pct)}%`,
                        height: '100%',
                        background: AREA_BAR_COLORS[idx % AREA_BAR_COLORS.length],
                        borderRadius: '5px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Document Completeness Donut/Ratio */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e3e8ef',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f1b33' }}>
              Tỷ lệ chuẩn hóa hồ sơ
            </div>
            <div style={{ fontSize: '12px', color: '#5b6577', marginTop: '2px' }}>
              Yêu cầu an toàn Vincons
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 py-4">
            <div
              style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#fdecec" strokeWidth="14" />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#1e3a8a"
                  strokeWidth="14"
                  strokeDasharray={circleCircumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f1b33' }}>
                  {loading ? '—' : `${validPct}%`}
                </div>
                <div
                  style={{ fontSize: '11px', color: '#5b6577', textTransform: 'uppercase', fontWeight: 700 }}
                >
                  Đạt chuẩn
                </div>
              </div>
            </div>
          </div>

          <div
            className="flex justify-around pt-3"
            style={{ borderTop: '1px solid #f0f3f8' }}
          >
            <div className="text-center">
              <div
                className="flex items-center justify-center gap-1.5"
                style={{ fontSize: '12px', color: '#5b6577' }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#1e3a8a',
                    display: 'inline-block',
                  }}
                />{' '}
                Đủ hồ sơ
              </div>
              <div
                style={{ fontSize: '16px', fontWeight: 700, color: '#0f1b33', marginTop: '2px' }}
              >
                {loading ? '—' : validCount.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="text-center">
              <div
                className="flex items-center justify-center gap-1.5"
                style={{ fontSize: '12px', color: '#5b6577' }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#e31c23',
                    display: 'inline-block',
                  }}
                />{' '}
                Thiếu hồ sơ
              </div>
              <div
                style={{ fontSize: '16px', fontWeight: 700, color: '#b4141a', marginTop: '2px' }}
              >
                {loading ? '—' : stats.missingDocs.toLocaleString('vi-VN')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ALERTS TABLES (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expiring Soon Table */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e3e8ef',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e3e8ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: '#fdf3dc',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock className="w-4 h-4" />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f1b33' }}>
                Thẻ sắp hết hạn (Gia hạn ngay)
              </span>
            </div>
            <Link
              href="/cards"
              style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a' }}
            >
              Xem tất cả ({stats.expiring}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    background: '#f7f9fc',
                    borderBottom: '1px solid #e3e8ef',
                    textAlign: 'left',
                    color: '#5b6577',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '8px 16px' }}>Công nhân</th>
                  <th style={{ padding: '8px 12px' }}>Ngày hết hạn</th>
                  <th style={{ padding: '8px 12px' }}>Còn lại</th>
                  <th style={{ padding: '8px 16px', textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {stats.expiringCards.length > 0 ? (
                  stats.expiringCards.slice(0, 5).map((card) => (
                    <tr key={card.id} style={{ borderBottom: '1px solid #f0f3f8' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f1b33' }}>{card.name}</div>
                        <div style={{ fontSize: '11px', color: '#5b6577' }}>
                          MNV: {card.mnv} • {card.team}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>{card.expiry}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          className="scmp-badge"
                          style={
                            card.daysLeft <= 7
                              ? { background: '#fdecec', color: '#b4141a' }
                              : { background: '#fdf3dc', color: '#92400e' }
                          }
                        >
                          Còn {card.daysLeft} ngày
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => router.push(`/workers/${card.id}/edit`)}
                          style={{
                            height: '28px',
                            padding: '0 10px',
                            borderRadius: '6px',
                            border: '1px solid #1e3a8a',
                            background: '#ffffff',
                            color: '#1e3a8a',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                          className="hover:bg-[#eef2fb] transition-colors"
                        >
                          Gia hạn
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#5b6577] text-sm">
                      Không có thẻ nào sắp hết hạn trong 30 ngày tới.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Missing Portrait / Docs Table */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e3e8ef',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e3e8ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: '#fdecec',
                  color: '#b4141a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f1b33' }}>
                Cần cập nhật hồ sơ ảnh
              </span>
            </div>
            <Link
              href="/workers"
              style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a' }}
            >
              Xem tất cả ({stats.missingDocs}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    background: '#f7f9fc',
                    borderBottom: '1px solid #e3e8ef',
                    textAlign: 'left',
                    color: '#5b6577',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '8px 16px' }}>Công nhân</th>
                  <th style={{ padding: '8px 12px' }}>Tổ / Nhà thầu</th>
                  <th style={{ padding: '8px 12px' }}>Thiếu</th>
                  <th style={{ padding: '8px 16px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {stats.missingPortraitWorkers.length > 0 ? (
                  stats.missingPortraitWorkers.map((w) => (
                    <tr key={w.id} style={{ borderBottom: '1px solid #f0f3f8' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f1b33' }}>{w.name}</div>
                        <div style={{ fontSize: '11px', color: '#5b6577' }}>MNV: {w.mnv}</div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>{w.team}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          className="scmp-badge"
                          style={{ background: '#fdecec', color: '#b4141a' }}
                        >
                          {w.missingLabel}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => router.push(`/workers/${w.id}/edit`)}
                          style={{
                            height: '28px',
                            padding: '0 10px',
                            borderRadius: '6px',
                            border: '1px solid #8592a4',
                            background: '#ffffff',
                            color: '#0f1b33',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                          className="hover:bg-[#f7f9fc] transition-colors"
                        >
                          Chụp ảnh
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#5b6577] text-sm">
                      Tất cả công nhân đã cập nhật đầy đủ ảnh thẻ.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
