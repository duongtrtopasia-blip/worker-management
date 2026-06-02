import React, { useRef, useLayoutEffect } from 'react';
import QRCode from 'react-qr-code';

const AutoFitText = ({ text, className, align = 'center', defaultFontSize = 13 }: { text: string; className?: string; align?: 'center' | 'left'; defaultFontSize?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current && textRef.current) {
      const container = containerRef.current;
      const textEl = textRef.current;
      
      textEl.style.fontSize = `${defaultFontSize}px`;
      let currentSize = defaultFontSize;
      
      while (textEl.scrollWidth > container.clientWidth && currentSize > 6) {
        currentSize -= 0.5;
        textEl.style.fontSize = `${currentSize}px`;
      }
    }
  }, [text, defaultFontSize]);

  return (
    <div ref={containerRef} className={`w-full overflow-hidden whitespace-nowrap flex ${align === 'center' ? 'justify-center' : 'justify-start'} ${className}`}>
      <span ref={textRef} style={{ fontSize: `${defaultFontSize}px`, display: 'inline-block' }}>
        {text}
      </span>
    </div>
  );
};

export type CardData = {
  card_type: 'person' | 'vehicle';
  card_number: string;
  worker: {
    full_name: string;
    employee_id: string;
    cccd_number: string;
    team_name: string;
    work_area: string;
    position?: string;
    portrait_url?: string;
  };
  project_name?: string;
  contractor_name?: string;
  vehicle_plate?: string;
  vehicle_type?: string;
  issue_date: string;
  expiry_date: string;
  qr_data: string; // Chuỗi WM:Base64
};

// Kích thước CR80 (85.6mm x 54mm) -> Khoảng 324px x 204px (ở 96 DPI)
// Tailwind tương đương: w-[204px] h-[324px] hoặc w-[324px] h-[204px]

export const PersonCard = ({ data }: { data: CardData }) => {
  return (
    <div className="w-[204px] h-[324px] bg-white border-[3px] border-brand-blue rounded-lg relative overflow-hidden flex flex-col items-center shadow-md font-sans text-xs">
      {/* Header */}
      <div className="w-full bg-white flex flex-col items-center pt-2 pb-1 border-b-[2px] border-brand-red/20">
        <div className="flex w-full justify-between items-center px-1 mb-[2px]">
           <img src="/vingroup_logo.svg" alt="Vingroup" className="h-[28px] w-auto object-contain shrink-0" />
           <div className="flex flex-col items-center justify-center text-center px-[2px] flex-1">
              <span className="font-bold text-[6px] text-brand-maroon uppercase leading-tight text-center whitespace-pre-line">{data.project_name || 'Tên Dự Án'}</span>
              <span className="font-semibold text-[5px] text-brand-blue uppercase leading-tight text-center mt-[1px]">{data.contractor_name || 'Tên Nhà Thầu'}</span>
           </div>
           <img src="/vincons_logo.png" alt="VINCONS" className="h-[28px] w-auto object-contain shrink-0" />
        </div>
        <div className="text-brand-red font-bold uppercase text-[12px] tracking-widest mt-[2px] drop-shadow-sm">Thẻ Ra Vào</div>
      </div>
      
      {/* Content */}
      <div className="flex flex-col items-center w-full mt-1 flex-grow px-2">
        <div className="w-[72px] h-[90px] bg-gray-100 rounded-md border-[2px] border-brand-blue/10 shadow-inner overflow-hidden shrink-0">
          {data.worker.portrait_url ? (
            <img src={data.worker.portrait_url} alt="Portrait" className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-[10px]">Ảnh</div>
          )}
        </div>
        
        <div className="text-center w-full mt-1">
          <AutoFitText text={data.worker.full_name} className="font-bold text-brand-blue pb-[2px] uppercase" defaultFontSize={13} align="center" />
          <p className="font-semibold text-brand-maroon text-[11px] leading-tight pb-[1px]">{data.worker.employee_id}</p>
          {data.worker.position && <p className="font-semibold text-brand-red text-[11px] leading-tight pb-[1px] uppercase">{data.worker.position}</p>}
          <p className="text-[10px] text-gray-700 leading-tight pb-[1px]">{data.worker.team_name}</p>
          <p className="text-[9px] text-gray-600 leading-tight pb-[1px]">CCCD: {data.worker.cccd_number}</p>
          <p className="text-[9px] text-gray-500 leading-tight">{data.worker.work_area}</p>
        </div>

        {/* Thanh biển số xe - luôn hiện, để trống nếu không có phương tiện */}
        <div className="mt-auto w-full bg-green-50 border border-green-500 text-green-800 font-bold text-[14px] rounded text-center py-1 leading-normal min-h-[28px]">
          {data.vehicle_plate || ''}
        </div>
      </div>
      
      {/* QR Code */}
      <div className="mt-[2px] mb-1 p-[2px] bg-white border border-brand-blue/20 shadow-sm rounded">
        <QRCode value={data.qr_data} size={50} level="M" fgColor="#1e3a8a" />
      </div>

      {/* Footer */}
      <div className="w-full text-center text-[9px] text-gray-500 pb-1 bg-gray-50 border-t mt-auto">
        <p>Số thẻ: {data.card_number}</p>
        <p className="font-semibold">HHL: {new Date(data.expiry_date).toLocaleDateString('vi-VN')}</p>
      </div>
    </div>
  );
};

export const PersonCardHorizontal = ({ data }: { data: CardData }) => {
  return (
    <div className="w-[324px] h-[204px] bg-white border-[3px] border-brand-blue rounded-lg relative overflow-hidden flex p-2 shadow-md font-sans text-xs">
      <div className="flex flex-col flex-1 min-w-0 border-r-[2px] border-dashed border-brand-blue/30 pr-2 justify-between">
        <div className="w-full flex justify-between items-center mb-1 pb-1 border-b-[2px] border-brand-red/20">
           <img src="/vingroup_logo.svg" alt="Vingroup" className="h-[24px] w-auto object-contain shrink-0" />
           <div className="flex flex-col items-center justify-center text-center px-1 flex-1">
              <span className="font-bold text-[8px] text-brand-maroon uppercase leading-tight text-center whitespace-pre-line">{data.project_name || 'Tên Dự Án'}</span>
              <span className="font-semibold text-[6px] text-brand-blue uppercase leading-tight text-center mt-[1px]">{data.contractor_name || 'Tên Nhà Thầu'}</span>
           </div>
           <img src="/vincons_logo.png" alt="VINCONS" className="h-[24px] w-auto object-contain shrink-0" />
        </div>
        <div className="flex w-full items-center">
           <div className="w-[66px] h-[84px] bg-gray-100 rounded-md border-[2px] border-brand-blue/10 shadow-inner overflow-hidden shrink-0 mr-3">
             {data.worker.portrait_url ? (
               <img src={data.worker.portrait_url} alt="Portrait" className="w-full h-full object-cover" />
             ) : (
               <div className="flex items-center justify-center h-full text-gray-400 text-[10px]">Ảnh</div>
             )}
           </div>
           <div className="flex flex-col space-y-[2px] overflow-hidden flex-1">
             <AutoFitText text={data.worker.full_name} className="font-bold text-brand-blue uppercase" defaultFontSize={13} align="left" />
             <p className="font-semibold text-brand-maroon text-[11px] leading-tight">{data.worker.employee_id}</p>
             {data.worker.position && <p className="font-semibold text-brand-red text-[11px] leading-tight uppercase">{data.worker.position}</p>}
             <p className="text-[10px] text-gray-700 leading-tight">{data.worker.team_name}</p>
             <p className="text-[9px] text-gray-600 leading-tight">CCCD: {data.worker.cccd_number}</p>
             <p className="text-[9px] text-gray-500 leading-tight">{data.worker.work_area}</p>
           </div>
        </div>
        
        {/* Thanh biển số xe - luôn hiện, để trống nếu không có phương tiện */}
        <div className="w-full bg-green-50 border border-green-500 text-green-800 font-bold text-[14px] rounded text-center py-1 leading-normal min-h-[28px]">
          {data.vehicle_plate || ''}
        </div>
      </div>
      
      <div className="w-24 shrink-0 flex flex-col items-center justify-between pl-2">
        <div className="w-full text-center mt-1 text-[10px] font-bold text-brand-red uppercase drop-shadow-sm">
           Thẻ Ra Vào
        </div>
        <div className="p-1 bg-white border border-brand-blue/20 shadow-sm rounded">
          <QRCode value={data.qr_data} size={64} level="M" fgColor="#1e3a8a" />
        </div>
        <div className="w-full text-center text-[9px]">
          <p className="text-gray-500">{data.card_number}</p>
          <p className="font-bold text-blue-900">HHL: {new Date(data.expiry_date).toLocaleDateString('vi-VN')}</p>
        </div>
      </div>
    </div>
  );
};

export const VehicleCard = ({ data }: { data: CardData }) => {
  return (
    <div className="w-[324px] h-[204px] bg-white border-[3px] border-brand-blue rounded-lg relative overflow-hidden flex p-2 shadow-md font-sans text-xs">
      <div className="flex flex-col flex-1 border-r-[2px] border-dashed border-brand-blue/30 pr-2">
        <div className="w-full flex flex-col mb-2 pb-1 border-b-[2px] border-brand-red/20 space-y-1">
          <div className="flex w-full justify-between items-center">
             <img src="/vingroup_logo.svg" alt="Vingroup" className="h-[14px] w-auto object-contain" />
             <img src="/vincons_logo.png" alt="VINCONS" className="h-[14px] w-auto object-contain" />
          </div>
          <div className="bg-brand-maroon text-white px-2 py-[2px] text-center font-bold rounded-sm uppercase text-[9px] shadow-sm">
            Thẻ Xe Ra Vào
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex"><span className="w-16 font-semibold">Chủ xe:</span><span>{data.worker.full_name}</span></div>
          <div className="flex"><span className="w-16 font-semibold">MNV:</span><span>{data.worker.employee_id}</span></div>
          <div className="flex"><span className="w-16 font-semibold">Biển số:</span><span className="font-bold text-green-700">{data.vehicle_plate}</span></div>
          <div className="flex"><span className="w-16 font-semibold">Loại xe:</span><span>{data.vehicle_type}</span></div>
          <div className="flex"><span className="w-16 font-semibold">Khu vực:</span><span>{data.worker.work_area}</span></div>
        </div>
      </div>
      
      <div className="w-24 flex flex-col items-center justify-between pl-2">
        <div className="w-full text-center mt-1 text-[9px] text-gray-500">
           Quét để KTr
        </div>
        <div className="p-1 bg-white border rounded">
          <QRCode value={data.qr_data} size={64} level="M" />
        </div>
        <div className="w-full text-center text-[9px]">
          <p className="text-gray-500">{data.card_number}</p>
          <p className="font-bold text-red-600">HHL: {new Date(data.expiry_date).toLocaleDateString('vi-VN')}</p>
        </div>
      </div>
    </div>
  );
};

export const CardTemplate = ({ data, layout = 'vertical' }: { data: CardData, layout?: 'vertical' | 'horizontal' }) => {
  if (data.card_type === 'vehicle') return <VehicleCard data={data} />;
  return layout === 'vertical' ? <PersonCard data={data} /> : <PersonCardHorizontal data={data} />;
};
