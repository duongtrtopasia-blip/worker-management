'use server';

import { supabase } from '@/lib/supabase';

export async function backupDatabaseAction() {
  try {
    // 1. Fetch all workers
    const { data: workersData, error: workersError } = await supabase
      .from('workers')
      .select('*');

    if (workersError) {
      throw new Error(`Error fetching workers: ${workersError.message}`);
    }

    // 2. Fetch all cards (if any)
    const { data: cardsData, error: cardsError } = await supabase
      .from('cards')
      .select('*');

    if (cardsError) {
      throw new Error(`Error fetching cards: ${cardsError.message}`);
    }

    // 3. Construct JSON
    const backupData = {
      timestamp: new Date().toISOString(),
      database: {
        workers: workersData,
        cards: cardsData,
      }
    };

    const jsonString = JSON.stringify(backupData, null, 2);

    return { success: true, data: jsonString };
  } catch (error: any) {
    console.error('Backup Error:', error);
    return { success: false, error: error.message || 'Lỗi không xác định khi backup' };
  }
}
