import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase
    .from('workers')
    .select('*, document_status(*), access_cards(*), documents(*)')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('workers')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const role = cookieStore.get('user_role')?.value;
  const username = cookieStore.get('username')?.value || 'unknown';

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Bạn không có quyền xóa công nhân' }, { status: 403 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  
  // Get worker info for audit log
  const { data: worker } = await supabase.from('workers').select('mnv, full_name').eq('id', params.id).single();
  
  const { error } = await supabase.from('workers').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Add audit log
  if (worker) {
    await supabase.from('audit_logs').insert({
      actor: username,
      role: role,
      action: 'DELETE',
      target: `${worker.full_name} (${worker.mnv})`,
      details: 'Đã xóa công nhân khỏi hệ thống'
    });
  }

  return NextResponse.json({ success: true });
}
