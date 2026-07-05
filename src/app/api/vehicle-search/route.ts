import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const plate = searchParams.get('plate')?.trim();

  if (!plate) {
    return NextResponse.json({ error: 'Vui lòng nhập biển số xe' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  // Tìm trong bảng access_cards theo vehicle_plate
  const { data: cards, error } = await supabase
    .from('access_cards')
    .select(`
      id,
      card_number,
      card_type,
      vehicle_plate,
      vehicle_type,
      issue_date,
      expiry_date,
      is_active,
      worker_id,
      workers (
        id,
        full_name,
        employee_id,
        cccd_number,
        team_name,
        work_area,
        position,
        phone,
        portrait_url,
        status
      )
    `)
    .ilike('vehicle_plate', `%${plate}%`)
    .eq('card_type', 'vehicle')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: cards ?? [], total: cards?.length ?? 0 });
}
