'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { updateWorkerAction } from '@/app/actions/worker';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUploader } from '@/components/documents/DocumentUploader';
import Image from 'next/image';

export default function EditWorkerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [worker, setWorker] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchWorker();
  }, []);

  const fetchWorker = async () => {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      toast.error('Không tìm thấy thông tin công nhân');
      router.push('/workers');
    } else {
      setWorker(data);
      if (data.portrait_url) {
        setImagePreview(data.portrait_url);
      }
    }
    setLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Kích thước ảnh phải nhỏ hơn 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);

    // Thu thập tất cả dữ liệu form
    const formData = new FormData(e.currentTarget);
    const file = fileInputRef.current?.files?.[0];

    // Nếu có file mới thì đính kèm, còn URL ảnh cũ (nếu có) cũng được gửi lên
    if (file) {
      formData.append('portrait', file);
    }
    if (worker?.portrait_url) {
      formData.append('existing_portrait_url', worker.portrait_url);
    }

    try {
      // Gọi Server Action để cập nhật, xử lý upload GDrive nếu cần
      const res = await updateWorkerAction(params.id, formData);
      if (res.success) {
        toast.success('Đã cập nhật hồ sơ công nhân!');
        setTimeout(() => {
          router.push('/workers');
          router.refresh();
        }, 1000);
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật hồ sơ');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu...</div>;
  }

  if (!worker) return null;

  // Hàm lấy URL document hiện có
  const getDocumentUrl = (docType: string) => {
    // Chúng ta cần fetch documents của worker này. Tạm thời lấy placeholder hoặc từ context
    // Do component DocumentUploader chỉ cần onSuccess để refetch, ta có thể tích hợp sau
    return undefined;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-brand-blue">Hồ Sơ Công Nhân</h1>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="info">Thông tin cơ bản</TabsTrigger>
          <TabsTrigger value="documents">Tích hợp hồ sơ</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <form onSubmit={handleSubmit} className="bg-white p-6 border rounded-md shadow-sm space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Ảnh chân dung (3:4)</Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 border-2 border-dashed rounded-md p-2 h-48 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer overflow-hidden relative"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full object-contain" />
                    ) : (
                      <span>Kéo thả hoặc click để tải ảnh mới lên</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="full_name">Họ và Tên *</Label>
                  <Input id="full_name" name="full_name" required defaultValue={worker.full_name} />
                </div>

                <div>
                  <Label htmlFor="employee_id">Mã Nhân Viên *</Label>
                  <Input id="employee_id" name="employee_id" required defaultValue={worker.mnv} />
                </div>

                <div>
                  <Label htmlFor="cccd">Số CCCD *</Label>
                  <Input id="cccd" name="cccd" required defaultValue={worker.cccd} maxLength={12} />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="team_name">Tổ Đội *</Label>
                  <Input id="team_name" name="team_name" required defaultValue={worker.team} />
                </div>

                <div>
                  <Label htmlFor="work_area">Khu Vực Làm Việc *</Label>
                  <Input id="work_area" name="work_area" required defaultValue={worker.area} />
                </div>

                <div>
                  <Label htmlFor="position">Chức Vụ</Label>
                  <Input id="position" name="position" placeholder="Thợ xây" defaultValue={worker.position || ''} />
                </div>

                <div>
                  <Label htmlFor="phone">Số Điện Thoại</Label>
                  <Input id="phone" name="phone" placeholder="0901234567" />
                </div>

                <div>
                  <Label htmlFor="start_date">Ngày Vào Làm</Label>
                  <Input id="start_date" name="start_date" type="date" />
                </div>
              </div>
            </div>

            {/* Thông tin phương tiện */}
            <div className="pt-4 border-t space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Thông tin Phương tiện (Tùy chọn)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="vehicle_plate">Biển Số Xe</Label>
                  <Input id="vehicle_plate" name="vehicle_plate" defaultValue={worker.vehicle_plate} placeholder="VD: 59X1-123.45" />
                </div>
                <div>
                  <Label htmlFor="vehicle_type">Loại Xe</Label>
                  <select id="vehicle_type" name="vehicle_type" defaultValue={worker.vehicle_type || ""} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Không có</option>
                    <option value="Xe Máy">Xe Máy</option>
                    <option value="Ô tô">Ô tô</option>
                    <option value="Xe Tải">Xe Tải</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 mt-6">
              <Button variant="outline" type="button" onClick={() => router.push('/workers')} className="text-gray-600 border-gray-300 hover:bg-gray-50">Hủy bỏ</Button>
              <Button type="submit" className="bg-brand-blue hover:bg-brand-blue/90 text-white">Lưu Thay Đổi</Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="documents">
          <div className="bg-white p-6 border rounded-md shadow-sm space-y-6 mt-4">
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-800">Tài liệu đính kèm (Google Drive)</h2>
              <p className="text-sm text-gray-500 mt-1">
                Các tài liệu tải lên tại đây sẽ tự động được tạo thư mục <b>{worker.mnv}-{worker.cccd}</b> trên Google Drive.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <DocumentUploader workerId={worker.id} docType="cccd_notarized" existingDocUrl={getDocumentUrl('cccd_notarized')} onSuccess={fetchWorker} />
              <DocumentUploader workerId={worker.id} docType="health_certificate" existingDocUrl={getDocumentUrl('health_certificate')} onSuccess={fetchWorker} />
              <DocumentUploader workerId={worker.id} docType="safety_card" existingDocUrl={getDocumentUrl('safety_card')} onSuccess={fetchWorker} />
              <DocumentUploader workerId={worker.id} docType="safety_commitment" existingDocUrl={getDocumentUrl('safety_commitment')} onSuccess={fetchWorker} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
