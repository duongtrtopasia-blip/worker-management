import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const team = searchParams.get('team');
  const area = searchParams.get('area');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const supabase = createRouteHandlerClient({ cookies });
  
  let query = supabase.from('workers').select(`
    *,
    document_status (*)
  `, { count: 'exact' });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,employee_id.ilike.%${search}%,cccd_number.ilike.%${search}%`);
  }
  if (team) {
    query = query.eq('team_name', team);
  }
  if (area) {
    query = query.eq('work_area', area);
  }

  const { data, error, count } = await query
    .range((page - 1) * limit, page * limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count, page, limit });
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    const body = await request.json();
    
    // Note: Lẽ ra cần validation ở đây với Zod
    const { data, error } = await supabase
      .from('workers')
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
