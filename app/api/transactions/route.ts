import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyTransaction, PointsError, type TransactionType } from '@/lib/points';

export async function POST(request: NextRequest) {
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

  let body: { customerId?: string; type?: TransactionType; points?: number; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { customerId, type, points, note } = body;

  if (!customerId || typeof customerId !== 'string') {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
  }
  if (!type || !['earn', 'redeem', 'adjustment'].includes(type)) {
    return NextResponse.json({ error: 'type must be earn, redeem, or adjustment' }, { status: 400 });
  }
  if (typeof points !== 'number' || !Number.isInteger(points) || points <= 0) {
    return NextResponse.json({ error: 'points must be a positive integer' }, { status: 400 });
  }

  try {
    const result = await applyTransaction({
      customerId,
      staffId: user.id,
      type,
      points,
      note: note ?? null,
    });

    return NextResponse.json(
      { transactionId: result.transactionId, newBalance: result.newBalance },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof PointsError) {
      const statusByCode: Record<PointsError['code'], number> = {
        invalid_type: 400,
        note_required: 400,
        customer_not_found: 404,
        insufficient_balance: 422,
      };
      return NextResponse.json({ error: err.message }, { status: statusByCode[err.code] });
    }
    console.error('Unexpected error applying transaction:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}