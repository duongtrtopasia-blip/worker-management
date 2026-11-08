import { supabase } from '@/lib/supabase';

const WORKER_COLUMNS =
  'id, mnv, full_name, cccd, team, area, portrait_url, status, created_at, vehicle_plate, vehicle_type, position, card_status, safety_card_number, safety_card_date, start_date, phone, address, gender, date_of_birth, work_status';

const CHUNK_SIZE = 1000;
const STALE_TIME_MS = 60_000; // 60s stale-while-revalidate

let workersCache: any[] | null = null;
let workersCacheTime = 0;
let workersInFlight: Promise<any[]> | null = null;
let progressListeners: Array<(partial: any[], total: number) => void> = [];

let docsCache: any[] | null = null;
let docsCacheTime = 0;
let docsInFlight: Promise<any[]> | null = null;
let docsTableMissing = false;

export function getCachedWorkers(): any[] | null {
  return workersCache;
}

export function getCachedDocuments(): any[] | null {
  if (docsTableMissing) return [];
  return docsCache;
}

export function invalidateDataCache() {
  workersCacheTime = 0;
  docsCacheTime = 0;
}

export function updateCachedWorkers(updater: (prev: any[]) => any[]) {
  if (workersCache) {
    workersCache = updater(workersCache);
    workersCacheTime = Date.now();
  }
}

async function fetchAllWorkersFromDB(): Promise<any[]> {
  const { data: firstChunk, count, error } = await supabase
    .from('workers')
    .select(WORKER_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, CHUNK_SIZE - 1);

  if (error) {
    console.error('Supabase fetch workers error:', error);
    throw error;
  }

  const initial = firstChunk || [];
  const total = count ?? initial.length;

  // Phát sự kiện ngay khi có 1.000 dòng đầu tiên (~350ms) để UI hiển thị bảng tức thì
  if (initial.length > 0 && progressListeners.length > 0) {
    for (const listener of progressListeners) {
      try {
        listener(initial, total);
      } catch {}
    }
  }

  if (initial.length < CHUNK_SIZE || total <= CHUNK_SIZE) {
    return initial;
  }

  // Tải song song tất cả các trang còn lại
  const remainingOffsets: number[] = [];
  for (let from = CHUNK_SIZE; from < total; from += CHUNK_SIZE) {
    remainingOffsets.push(from);
  }

  const chunkResults = await Promise.all(
    remainingOffsets.map((from) =>
      supabase
        .from('workers')
        .select(WORKER_COLUMNS)
        .order('created_at', { ascending: false })
        .range(from, from + CHUNK_SIZE - 1)
    )
  );

  let all = initial;
  for (const res of chunkResults) {
    if (res.data && res.data.length > 0) {
      all = all.concat(res.data);
    }
  }
  return all;
}

async function fetchAllDocumentsFromDB(): Promise<any[]> {
  if (docsTableMissing) return [];

  const { data: firstChunk, count, error } = await supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .range(0, CHUNK_SIZE - 1);

  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('documents')) {
      docsTableMissing = true;
    }
    return [];
  }

  const initial = firstChunk || [];
  const total = count ?? initial.length;

  if (initial.length < CHUNK_SIZE || total <= CHUNK_SIZE) {
    return initial;
  }

  const remainingOffsets: number[] = [];
  for (let from = CHUNK_SIZE; from < total; from += CHUNK_SIZE) {
    remainingOffsets.push(from);
  }

  const chunkResults = await Promise.all(
    remainingOffsets.map((from) =>
      supabase
        .from('documents')
        .select('*')
        .range(from, from + CHUNK_SIZE - 1)
    )
  );

  let all = initial;
  for (const res of chunkResults) {
    if (res.data && res.data.length > 0) {
      all = all.concat(res.data);
    }
  }
  return all;
}

export async function fetchWorkersCached(
  force = false,
  onFirstChunk?: (partial: any[], total: number) => void
): Promise<any[]> {
  const now = Date.now();
  if (!force && workersCache && now - workersCacheTime < STALE_TIME_MS) {
    return workersCache;
  }
  if (onFirstChunk) {
    progressListeners.push(onFirstChunk);
  }
  if (workersInFlight) {
    return workersInFlight;
  }

  workersInFlight = fetchAllWorkersFromDB()
    .then((data) => {
      workersCache = data;
      workersCacheTime = Date.now();
      return data;
    })
    .finally(() => {
      workersInFlight = null;
      progressListeners = [];
    });

  return workersInFlight;
}

export async function fetchDocumentsCached(force = false): Promise<any[]> {
  if (docsTableMissing) return [];
  const now = Date.now();
  if (!force && docsCache && now - docsCacheTime < STALE_TIME_MS) {
    return docsCache;
  }
  if (docsInFlight) {
    return docsInFlight;
  }

  docsInFlight = fetchAllDocumentsFromDB()
    .then((data) => {
      docsCache = data;
      docsCacheTime = Date.now();
      return data;
    })
    .finally(() => {
      docsInFlight = null;
    });

  return docsInFlight;
}
