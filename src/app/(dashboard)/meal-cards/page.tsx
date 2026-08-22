'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { MealCardTemplate, MealCardData } from '@/components/cards/MealCardTemplate';
import {
  UtensilsCrossed, RefreshCw, CheckSquare, Square, Printer,
  Search, X, Sun, Moon, Layers,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type ShiftType = 'morning' | 'afternoon' | 'both';

type TeamGroup = {
  team_name: string;
  worker_count: number;
  leader: string;
};

export default function MealCardsPage() {
  const [teams, setTeams] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [checkedTeams, setCheckedTeams] = useState<Set<string>>(new Set());
  const [shift, setShift] = useState<ShiftType>('both');
  const [searchQuery, setSearchQuery] = useState('');


  useEffect(() => { fetchTeams(); }, []);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      let allData: any[] = [];
      let from = 0;
      const step = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('workers')
          .select('team')
          .eq('status', 'active')
          .range(from, from + step - 1);

        if (error) { toast.error('Lỗi khi tải dữ liệu tổ đội'); break; }
        if (data && data.length > 0) {
          allData = allData.concat(data);
          if (data.length < step) break;
          from += step;
        } else break;
      }

      // Group by team
      const teamMap = new Map<string, number>();
      allData.forEach(w => {
        const team = w.team || 'Chưa phân tổ';
        teamMap.set(team, (teamMap.get(team) || 0) + 1);
      });

      const grouped = Array.from(teamMap.entries())
        .map(([team_name, worker_count]) => ({
          team_name,
          worker_count,
          leader: '',
        }))
        .sort((a, b) => a.team_name.localeCompare(b.team_name, 'vi'));

      setTeams(grouped);
      if (grouped.length > 0 && !selectedTeam) {
        setSelectedTeam(grouped[0].team_name);
      }
    } catch {
      toast.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter(t =>
      t.team_name.toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  const toggleCheck = (teamName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamName)) next.delete(teamName);
      else next.add(teamName);
      return next;
    });
  };

  const toggleAll = () => {
    const allSel = filteredTeams.length > 0 && filteredTeams.every(t => checkedTeams.has(t.team_name));
    if (allSel) {
      setCheckedTeams(prev => {
        const next = new Set(prev);
        filteredTeams.forEach(t => next.delete(t.team_name));
        return next;
      });
    } else {
      setCheckedTeams(prev => {
        const next = new Set(prev);
        filteredTeams.forEach(t => next.add(t.team_name));
        return next;
      });
    }
  };

  const allChecked = filteredTeams.length > 0 && filteredTeams.every(t => checkedTeams.has(t.team_name));

  const buildCardData = (teamName: string): MealCardData => ({
    team_name: teamName,
    team_leader: teamName,
    shift,
  });

  const openPrintWindow = (bodyHTML: string, pageSize: string) => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) { toast.error('Vui lòng cho phép mở popup để in thẻ!'); return; }
    const styles = Array.from(document.styleSheets)
      .map((sheet) => { try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n'); } catch { return ''; } })
      .join('\n');
    const origin = window.location.origin;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8" /><base href="${origin}" /><style>@font-face{font-family:'UTM Avo';font-style:normal;font-weight:400;src:url('${origin}/fonts/UTMAvo-Regular.ttf') format('truetype');}@font-face{font-family:'UTM Avo';font-style:normal;font-weight:700;src:url('${origin}/fonts/UTMAvo-Bold.ttf') format('truetype');}</style><style>${styles}@page{size:${pageSize};margin:0;}html,body{margin:0;padding:0;background:white;font-family:'UTM Avo',sans-serif;}:root{--color-brand-blue:#1e3a8a;--color-brand-red:#970731;--color-brand-maroon:#7f1d1d;}.text-brand-blue{color:#1e3a8a!important;}.text-brand-red{color:#970731!important;}.text-brand-maroon{color:#7f1d1d!important;}.border-brand-blue{border-color:#1e3a8a!important;}.border-brand-blue\\/30{border-color:rgba(30,58,138,0.3)!important;}.border-brand-red\\/20{border-color:rgba(151,7,49,0.2)!important;}</style></head><body>${bodyHTML}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 800); };
  };

  const handlePrintSingle = () => {
    if (!selectedTeam) return;
    const cardElement = document.getElementById('meal-card-preview');
    if (!cardElement) return;
    const bodyHTML = `<div style="width:85.6mm;height:54mm;display:flex;align-items:center;justify-content:center;">${cardElement.innerHTML}</div>`;
    openPrintWindow(bodyHTML, '85.6mm 54mm');
    toast.success('Đang in thẻ cơm...');
  };

  const handlePrintBulk = () => {
    const targetTeams = checkedTeams.size > 0
      ? filteredTeams.filter(t => checkedTeams.has(t.team_name))
      : filteredTeams;

    if (targetTeams.length === 0) { toast.error('Không có tổ đội nào để in!'); return; }

    // Gather card HTML from hidden render
    const cardHTMLs: string[] = [];
    targetTeams.forEach(t => {
      const el = document.querySelector(`[data-meal-team="${t.team_name}"]`);
      if (el) cardHTMLs.push(el.innerHTML);
    });

    if (cardHTMLs.length === 0) { toast.error('Không thể lấy dữ liệu thẻ!'); return; }

    const cardsPerPage = 10;
    const pages: string[][] = [];
    for (let i = 0; i < cardHTMLs.length; i += cardsPerPage) pages.push(cardHTMLs.slice(i, i + cardsPerPage));

    const html = pages.map((pageCards, pi) => {
      const cells = Array.from({ length: cardsPerPage }, (_, ci) => {
        const h = pageCards[ci] || '';
        return `<div style="width:85.6mm;height:54mm;overflow:hidden;flex-shrink:0;${h ? '' : 'visibility:hidden;'}">${h}</div>`;
      }).join('');
      return `<div style="width:210mm;height:297mm;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:4mm;padding:5.5mm 17.4mm;box-sizing:border-box;page-break-after:${pi < pages.length - 1 ? 'always' : 'auto'};background:white;">${cells}</div>`;
    }).join('');

    openPrintWindow(html, 'A4 portrait');
    toast.success(`Đang in ${targetTeams.length} thẻ cơm...`);
    setCheckedTeams(new Set());
  };

  const previewData = selectedTeam ? buildCardData(selectedTeam) : null;

  return (
    <div className="p-6 space-y-6">

      {/* PAGE HEADER */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Thẻ Cơm Tổ Đội</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="font-semibold text-amber-600">{teams.length}</span> tổ đội
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchTeams} className="gap-1.5 text-gray-600">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </Button>

          {/* Shift toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setShift('morning')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${shift === 'morning' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Sun className="h-3.5 w-3.5" /> Sáng
            </button>
            <button
              onClick={() => setShift('afternoon')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${shift === 'afternoon' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Moon className="h-3.5 w-3.5" /> Chiều
            </button>
            <button
              onClick={() => setShift('both')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${shift === 'both' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Layers className="h-3.5 w-3.5" /> Cả hai
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handlePrintSingle} disabled={!previewData} className="gap-1.5 text-amber-600 border-amber-400/40 hover:bg-amber-50">
            <Printer className="h-4 w-4" /> In thẻ này
          </Button>
          <Button size="sm" onClick={handlePrintBulk} disabled={filteredTeams.length === 0} className="gap-1.5 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Printer className="h-4 w-4" />
            {checkedTeams.size > 0 ? `In ${checkedTeams.size} thẻ đã chọn` : `In tất cả (${filteredTeams.length})`}
          </Button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 lg:h-[calc(100vh-200px)] pb-6 lg:pb-0">

        {/* Card Preview */}
        <div className="lg:col-span-3 order-2 lg:order-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }} />
              <h2 className="font-semibold text-gray-800">Bản Xem Trước</h2>
            </div>
            {selectedTeam && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 font-medium border border-amber-200">
                Thẻ Cơm
              </span>
            )}
          </div>
          <div className="flex-1 flex justify-center items-center bg-gray-50 p-6 lg:p-10 min-h-[350px] lg:min-h-0 overflow-hidden">
            {previewData ? (
              <div id="meal-card-preview" className="drop-shadow-2xl scale-75 sm:scale-90 lg:scale-100 origin-center">
                <MealCardTemplate data={previewData} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-300">
                <UtensilsCrossed className="w-16 h-16" />
                <p className="text-sm">Chọn một tổ đội để xem trước thẻ cơm</p>
              </div>
            )}
          </div>
        </div>

        {/* Team List */}
        <div className="lg:col-span-2 order-1 lg:order-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[500px] lg:h-auto">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }} />
                <h2 className="font-semibold text-gray-800">Danh Sách Tổ Đội</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">{filteredTeams.length}</span>
              </div>
              {filteredTeams.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="text-xs font-medium flex items-center gap-1 transition-colors text-amber-600 hover:text-amber-700"
                >
                  {allChecked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  {allChecked ? 'Bỏ chọn tất cả' : `Chọn tất cả (${filteredTeams.length})`}
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm tổ đội..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400/30 focus:border-amber-400/30 transition-shadow"
              />
            </div>
          </div>

          {checkedTeams.size > 0 && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-700">
              <span>Đã chọn <strong>{checkedTeams.size}</strong> tổ đội để in</span>
              <button onClick={() => setCheckedTeams(new Set())} className="hover:opacity-70">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-16">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Đang tải...</span>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <UtensilsCrossed className="w-12 h-12 text-gray-200" />
                <p className="text-sm text-gray-500 font-medium">Không tìm thấy tổ đội nào</p>
              </div>
            ) : (
              filteredTeams.map((t) => {
                const isChecked = checkedTeams.has(t.team_name);
                const isSelected = selectedTeam === t.team_name;
                return (
                  <div
                    key={t.team_name}
                    onClick={() => setSelectedTeam(t.team_name)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? 'border-amber-400/40 bg-amber-50/60 ring-1 ring-amber-400/20' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    } ${isChecked ? 'border-amber-300 bg-amber-50/60' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => toggleCheck(t.team_name, e)} className="shrink-0">
                        {isChecked
                          ? <CheckSquare className="h-4 w-4 text-amber-600" />
                          : <Square className="h-4 w-4 text-gray-300 hover:text-gray-400" />
                        }
                      </button>
                      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 border-white shadow-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <UtensilsCrossed className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{t.team_name}</p>
                        <p className="text-xs text-gray-400">{t.worker_count} công nhân</p>
                      </div>
                    </div>


                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Hidden render for bulk print */}
      <div className="absolute opacity-0 pointer-events-none -z-50 -top-[9999px] -left-[9999px]">
        {teams.map((t) => (
          <div key={t.team_name} data-meal-team={t.team_name}>
            <MealCardTemplate data={buildCardData(t.team_name)} />
          </div>
        ))}
      </div>
    </div>
  );
}
