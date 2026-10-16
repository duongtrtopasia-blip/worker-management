'use client';

import React from 'react';

export type MealCardData = {
  team_name: string;
  team_leader: string;
  shift: 'morning' | 'afternoon' | 'both';
};

/**
 * Thẻ Cơm - Meal Card Template
 * Kích thước CR80 ngang: 85.6mm x 54mm ≈ 324px x 204px (96 DPI)
 * Hiển thị: Tên tổ đội, tên tổ trưởng, giờ lấy cơm
 */
export const MealCardTemplate = ({ data }: { data: MealCardData }) => {
  return (
    <div
      className="w-[324px] h-[204px] bg-white border-[3px] border-brand-blue rounded-lg relative overflow-hidden flex flex-col shadow-md font-sans text-xs"
      style={{ fontFamily: "'UTM Avo', sans-serif" }}
    >
      {/* Header with logos */}
      <div className="w-full bg-white flex items-center justify-between px-3 pt-2 pb-1.5 border-b-[2px] border-brand-red/20">
        <img src="/vingroup_logo.png" alt="Vingroup" className="h-[22px] w-auto object-contain shrink-0" />
        <div className="flex flex-col items-center justify-center text-center px-2 flex-1">
          <span className="font-bold text-[7px] text-brand-maroon uppercase leading-tight text-center whitespace-pre-line">
            {'Khu DLND Mỹ Lâm\nTuyên Quang'}
          </span>
          <span className="font-semibold text-[5.5px] text-brand-blue uppercase leading-tight text-center mt-[1px]">
            VINCONS
          </span>
        </div>
        <img src="/vincons_logo.png" alt="VINCONS" className="h-[22px] w-auto object-contain shrink-0" />
      </div>

      {/* Title */}
      <div className="w-full text-center py-1.5" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
        <span className="text-white font-bold text-[16px] tracking-[0.2em] uppercase drop-shadow-sm">
          THẺ CƠM
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-4 py-2 space-y-2">
        {/* Team name */}
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold text-gray-600 shrink-0 w-[60px]">Tổ đội:</span>
          <span className="text-[13px] font-bold text-brand-blue uppercase truncate flex-1">
            {data.team_name}
          </span>
        </div>

        {/* Team leader */}
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold text-gray-600 shrink-0 w-[60px]">Tổ trưởng:</span>
          <span className="text-[13px] font-bold text-brand-maroon uppercase truncate flex-1">
            {data.team_leader}
          </span>
        </div>

        {/* Meal time */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-semibold text-gray-600 shrink-0 w-[60px]">Giờ cơm:</span>
          <div className="flex gap-2 flex-1">
            {(data.shift === 'morning' || data.shift === 'both') && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-400 bg-amber-50">
                <span className="text-[10px] font-bold text-amber-700">SÁNG : 10:30</span>
              </div>
            )}
            {(data.shift === 'afternoon' || data.shift === 'both') && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md border border-blue-400 bg-blue-50">
                <span className="text-[10px] font-bold text-blue-700">CHIỀU : 17:15</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full text-center py-1 bg-gray-50 border-t border-gray-200">
        <span className="text-[8px] text-gray-400 font-medium">
          Thẻ này chỉ có giá trị trong khu vực công trường
        </span>
      </div>
    </div>
  );
};
