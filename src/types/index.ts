export type Worker = {
  id?: string;
  employee_id: string;
  full_name: string;
  cccd_number: string;
  date_of_birth?: string;
  gender?: 'Nam' | 'Nữ' | string;
  phone?: string;
  address?: string;
  team_name: string;
  work_area: string;
  position?: string;
  start_date?: string;
  status?: 'active' | 'inactive' | 'suspended';
  portrait_url?: string;
  portrait_drive_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type DocumentType = 
  | 'health_certificate' 
  | 'cccd_notarized' 
  | 'safety_card' 
  | 'safety_test' 
  | 'safety_commitment' 
  | 'other';

export type WorkerFolders = {
  rootFolderId: string;
  portrait: string;
  cccd: string;
  health: string;
  safety_card: string;
  safety_test: string;
  safety_commitment: string;
  other: string;
};

export type UploadItem = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  docType?: DocumentType;
  workerFolderId?: string; // Tùy thuộc vào loại
};

export type UploadResult = {
  success: boolean;
  fileId?: string;
  viewUrl?: string;
  downloadUrl?: string;
  error?: string;
  originalFileName: string;
};
