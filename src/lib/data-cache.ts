import { supabase } from '@/lib/supabase';

const WORKER_COLUMNS =
  'id, mnv, full_name, cccd, phone, date_of_birth, start_date, team, area, position, card_status, work_status, status, portrait_url, vehicle_plate, vehicle_type, safety_training_date, address, created_at';

const DOC_COLUMNS =
  'id, worker_id, doc_type, issue_date, expiry_date, file_url, created_at';

const CHUNK_SIZE = 1000;
const STALE_TIME_MS = 45_000; // 45s stale-while-revalidate

let workersCache: any[] | null = null;
let workersCacheTime = 0;
let workersInFlight: Promise<any[]> | null = null;

let docsCache: any[] | null = null;
let docsCacheTime = 0;
let docsInFlight: Promise<any[]> | null = null;

export function getCachedWorkers(): any[] | null {
  return workersCache;
}

export function getCachedDocuments(): any[] | null {
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

  if (error) throw error;
  const initial = firstChunk || [];
  const total = count ?? initial.length;

  if (initial.length < CHUNK_SIZE || total <= CHUNK_SIZE) {
    return initial;
  }

  // Tải song song tất cả các trang còn lại thay vì vòng lặp while tuần tự
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
  const { data: firstChunk, count, error } = await supabase
    .from('documents')
    .select(DOC_COLUMNS, { count: 'exact' })
    .range(0, CHUNK_SIZE - 1);

  if (error) throw error;
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
        .select(DOC_COLUMNS)
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

export async function fetchWorkersCached(force = false): Promise<any[]> {
  const now = Date.now();
  if (!force && workersCache && now - workersCacheTime < STALE_TIME_MS) {
    return workersCache;
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
    });

  return workersInFlight;
}

export async function fetchDocumentsCached(force = false): Promise<any[]> {
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

