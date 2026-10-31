import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

import { formatVehiclePlate } from '@/lib/format-vehicle';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const plate = searchParams.get('plate')?.trim();

  if (!plate) {
    return NextResponse.json({ error: 'Vui lòng nhập biển số xe' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  const formatted = formatVehiclePlate(plate);
  const unformatted = plate.replace(/[-.\s]/g, '');
  const variants = Array.from(new Set([plate, formatted, unformatted].filter(Boolean)));
  const orFilter = variants.map(v => `vehicle_plate.ilike.%${v}%`).join(',');

  // vehicle_plate nằm trong bảng workers
  const { data: workers, error } = await supabase
    .from('workers')
    .select(`
      id,
      mnv,
      full_name,
      cccd,
      team,
      area,
      position,
      phone,
      portrait_url,
      work_status,
      card_status,
      vehicle_plate,
      vehicle_type,
      start_date,
      created_at
    `)
    .or(orFilter)
    .not('vehicle_plate', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: workers ?? [], total: workers?.length ?? 0 });
}
