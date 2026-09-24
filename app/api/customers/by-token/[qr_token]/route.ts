import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qr_token: string }> }
) {
  const { qr_token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: staffRow } = await supabase
    .from('staff')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!staffRow) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, name, points_balance')
    .eq('qr_token', qr_token)
    .maybeSingle();

  if (error || !customer) {
    return NextResponse.json({ error: 'customer not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: customer.id,
    name: customer.name,
    pointsBalance: customer.points_balance,
  });
}