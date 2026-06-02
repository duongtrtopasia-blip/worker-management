import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { Worker, WorkerFolders, UploadItem, UploadResult, DocumentType } from '@/types';

/**
 * Khởi tạo Google Drive Client.
 * Hỗ trợ cả OAuth2 (nếu có Refresh Token) hoặc Service Account (thông qua credentials).
 */
export function initDriveClient(): drive_v3.Drive {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // Fallback to Service Account (requires GOOGLE_APPLICATION_CREDENTIALS env var or default credentials)
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

/**
 * Trả về folder ID của folder ROOT (thường lấy từ biến môi trường).
 */
function getRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error('Missing GOOGLE_DRIVE_FOLDER_ID in environment variables');
  return id;
}

/**
 * Chuyển đổi Buffer sang Readable Stream để upload.
 */
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

/**
 * Tìm thư mục theo tên và parentId, nếu chưa có thì tạo mới.
 */
export async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = initDriveClient();
  
  // Tìm folder
  const query = `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Tạo mới nếu không tìm thấy
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  };

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });

  return folder.data.id!;
}

/**
 * Tạo cây thư mục cho 1 công nhân.
 * Cấu trúc: [ROOT] / [Khu vực - Tổ đội] / [MNV - Họ tên] / [Các thư mục con]
 */
export async function createWorkerFolderStructure(worker: Worker): Promise<WorkerFolders> {
  const rootId = getRootFolderId();

  // 1. Thư mục Khu vực - Tổ đội
  const areaTeamName = `${worker.work_area} - ${worker.team_name}`;
  const areaTeamFolderId = await getOrCreateFolder(areaTeamName, rootId);

  // 2. Thư mục Công nhân
  const workerFolderName = `${worker.employee_id} - ${worker.full_name}`;
  const workerFolderId = await getOrCreateFolder(workerFolderName, areaTeamFolderId);

  // 3. Các thư mục con
  const subFolders = ['portrait', 'cccd', 'health', 'safety_card', 'safety_test', 'safety_commitment', 'other'];
  const folderIds: Record<string, string> = {};

  for (const sub of subFolders) {
    folderIds[sub] = await getOrCreateFolder(sub, workerFolderId);
  }

  return {
    rootFolderId: workerFolderId,
    portrait: folderIds['portrait'],
    cccd: folderIds['cccd'],
    health: folderIds['health'],
    safety_card: folderIds['safety_card'],
    safety_test: folderIds['safety_test'],
    safety_commitment: folderIds['safety_commitment'],
    other: folderIds['other'],
  };
}

/**
 * Upload file chung lên Google Drive.
 * Có xử lý set permission (anyone with link can view).
 * Hỗ trợ retry nếu gặp lỗi rate limit (429).
 */
export async function uploadFile(
  params: { fileBuffer: Buffer; fileName: string; mimeType: string; folderId: string },
  retryCount = 0
): Promise<{ fileId: string; viewUrl: string; downloadUrl: string }> {
  const drive = initDriveClient();

  try {
    const fileMetadata = {
      name: params.fileName,
      parents: [params.folderId],
    };
    const media = {
      mimeType: params.mimeType,
      body: bufferToStream(params.fileBuffer),
    };

    const res = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = res.data.id!;

    // Set public view permission
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId,
      viewUrl: res.data.webViewLink as string,
      downloadUrl: res.data.webContentLink as string,
    };
  } catch (error: any) {
    if (error.code === 429 && retryCount < 3) {
      // Exponential backoff
      const waitTime = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return uploadFile(params, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Upload ảnh chân dung.
 */
export async function uploadPortrait(params: {
  imageBuffer: Buffer;
  fileName: string;
  workerFolderId: string;
}): Promise<{ fileId: string; viewUrl: string }> {
  // Tìm hoặc tạo folder 'portrait' bên trong workerFolderId
  const portraitFolderId = await getOrCreateFolder('portrait', params.workerFolderId);
  
  const mimeType = params.fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const result = await uploadFile({
    fileBuffer: params.imageBuffer,
    fileName: params.fileName,
    mimeType,
    folderId: portraitFolderId,
  });

  return { fileId: result.fileId, viewUrl: result.viewUrl };
}

/**
 * Upload tài liệu (PDF).
 */
export async function uploadDocument(params: {
  pdfBuffer: Buffer;
  docType: DocumentType;
  workerFolderId: string;
  fileName: string;
}): Promise<{ fileId: string; viewUrl: string }> {
  // Tìm hoặc tạo folder tương ứng với docType
  const docFolderId = await getOrCreateFolder(params.docType, params.workerFolderId);
  
  const result = await uploadFile({
    fileBuffer: params.pdfBuffer,
    fileName: params.fileName,
    mimeType: 'application/pdf',
    folderId: docFolderId,
  });

  return { fileId: result.fileId, viewUrl: result.viewUrl };
}

/**
 * Xóa file trên Drive.
 */
export async function deleteFile(fileId: string): Promise<void> {
  const drive = initDriveClient();
  await drive.files.delete({ fileId });
}

/**
 * Trả về URL view tĩnh nếu không muốn dùng webViewLink từ API (hoặc để chuẩn hóa).
 */
export function getFileViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Bulk upload file với concurrency (giới hạn số lượng file upload cùng lúc).
 */
export async function bulkUploadDocuments(files: UploadItem[], maxConcurrency = 5): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  const queue = [...files];

  // Hàm worker để xử lý các item trong queue
  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;

      try {
        if (!item.workerFolderId) {
            throw new Error('Missing workerFolderId');
        }
        
        let result;
        if (item.docType) {
          result = await uploadDocument({
            pdfBuffer: item.buffer,
            docType: item.docType,
            workerFolderId: item.workerFolderId,
            fileName: item.fileName,
          });
        } else {
          result = await uploadFile({
            fileBuffer: item.buffer,
            fileName: item.fileName,
            mimeType: item.mimeType,
            folderId: item.workerFolderId,
          });
        }

        results.push({
          success: true,
          fileId: result.fileId,
          viewUrl: result.viewUrl,
          originalFileName: item.fileName,
        });
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
          originalFileName: item.fileName,
        });
      }
    }
  };

  // Khởi tạo các workers chạy song song
  const workers = Array(Math.min(maxConcurrency, files.length)).fill(null).map(() => worker());
  await Promise.all(workers);

  return results;
}
