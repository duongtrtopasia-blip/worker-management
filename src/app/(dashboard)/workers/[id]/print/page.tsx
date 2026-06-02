'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { FileText, Printer, ChevronLeft, ExternalLink, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function PrintCenterPage({ params }: { params: { id: string } }) {
  const [worker, setWorker] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Lấy thông tin công nhân
    const { data: workerData } = await supabase
      .from('workers')
      .select('*')
      .eq('id', params.id)
      .single();

    // Lấy thông tin tài liệu
    const { data: docsData } = await supabase
      .from('documents')
      .select('*')
      .eq('worker_id', params.id);

    setWorker(workerData);
    setDocuments(docsData || []);
    setLoading(false);
  };

  const getDoc = (type: string) => documents.find(d => d.doc_type === type);

  const docTypes = [
    { type: 'cccd_notarized', name: 'CCCD / CMND', printNote: 'In Khổ A4 (1 mặt)' },
    { type: 'health_certificate', name: 'Giấy khám sức khỏe', printNote: 'In Khổ A3 (2 mặt)' },
    { type: 'safety_card', name: 'Thẻ An Toàn', printNote: 'In Khổ A4 (1 mặt)' },
    { type: 'safety_commitment', name: 'Cam kết An Toàn', printNote: 'In Khổ A4 (1 mặt)' },
  ];

  if (loading) return <div className="p-10 text-center text-gray-500">Đang chuẩn bị trung tâm in ấn...</div>;
  if (!worker) return <div className="p-10 text-center text-red-500">Không tìm thấy công nhân!</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <Link href="/workers">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-gray-300">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trung tâm In ấn Hồ Sơ</h1>
            <p className="text-gray-500 mt-1">Quản lý và in tài liệu của nhân viên</p>
          </div>
        </div>
        
        {/* Worker Info Card */}
        <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 p-3 rounded-xl shadow-sm">
          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
            {worker.portrait_url ? (
              <img src={worker.portrait_url} alt="Portrait" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Ảnh</div>
            )}
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{worker.full_name}</h2>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>MNV: {worker.mnv}</span>
              <span>•</span>
              <span>CCCD: {worker.cccd}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Intro Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
        <AlertCircle className="w-5 h-5 shrink-0 text-blue-500" />
        <div>
          <p className="font-semibold mb-1">Hướng dẫn In Ấn</p>
          <p className="opacity-90">
            Do giới hạn của trình duyệt, bạn không thể in tự động nhiều khổ giấy cùng lúc. Hãy click vào nút <strong>"Mở file & In"</strong> của từng tài liệu dưới đây. File sẽ được mở trên Google Drive, từ đó bạn có thể chọn lệnh In (Ctrl+P) và thiết lập khổ giấy mong muốn (A3, A4, in 2 mặt).
          </p>
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {docTypes.map(def => {
          const doc = getDoc(def.type);
          
          return (
            <div key={def.type} className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-brand-blue/10 rounded-xl text-brand-blue">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{def.name}</h3>
                      <span className="inline-block mt-1 text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                        {def.printNote}
                      </span>
                    </div>
                  </div>
                  
                  {doc ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Đã có file
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Chưa nộp
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100">
                  {doc && doc.file_url ? (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white gap-2 shadow-sm">
                        <Printer className="w-4 h-4" />
                        Mở File & In
                        <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                      </Button>
                    </a>
                  ) : (
                    <Button variant="outline" disabled className="w-full text-gray-400 bg-gray-50 border-gray-200">
                      Không có tài liệu để in
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
}
