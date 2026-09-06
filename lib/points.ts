import sql from '@/lib/db';

export type TransactionType = 'earn' | 'redeem' | 'adjustment';

export class PointsError extends Error {
  code: 'invalid_type' | 'note_required' | 'customer_not_found' | 'insufficient_balance';
  constructor(code: PointsError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

interface ApplyTransactionInput {
  customerId: string;
  staffId: string;
  type: TransactionType;
  points: number; // always a positive magnitude — this function decides the sign
  note: string | null;
}

interface ApplyTransactionResult {
  transactionId: string;
  newBalance: number;
}

/**
 * The one place points_balance is ever changed. All validation and the
 * sign decision live here in application code (no DB functions) — the
 * only SQL is a plain transaction with a row lock, run from here.
 *
 * Never call this from more than one route. See docs/lld.md Section 5.
 */
export async function applyTransaction(
  input: ApplyTransactionInput
): Promise<ApplyTransactionResult> {
  const { customerId, staffId, type, points, note } = input;

  if (!['earn', 'redeem', 'adjustment'].includes(type)) {
    throw new PointsError('invalid_type', `"${type}" is not a valid transaction type`);
  }
  if ((type === 'redeem' || type === 'adjustment') && !note?.trim()) {
    throw new PointsError('note_required', 'note is required for redeem and adjustment');
  }
  if (!Number.isInteger(points) || points <= 0) {
    throw new PointsError('invalid_type', 'points must be a positive integer');
  }

  const signedPoints = type === 'earn' ? points : -points;

  return sql.begin(async (tx) => {
    // Row lock prevents two staff scanning the same customer at the same
    // instant from both reading the pre-update balance.
    const [customer] = await tx<{ points_balance: number }[]>`
      select points_balance from customers where id = ${customerId} for update
    `;

    if (!customer) {
      throw new PointsError('customer_not_found', 'no customer with that id');
    }

    const newBalance = customer.points_balance + signedPoints;

    if (type === 'redeem' && newBalance < 0) {
      throw new PointsError('insufficient_balance', 'balance cannot go below zero');
    }

    const [transaction] = await tx<{ id: string }[]>`
      insert into transactions (customer_id, staff_id, type, points, note)
      values (${customerId}, ${staffId}, ${type}, ${signedPoints}, ${note ?? null})
      returning id
    `;

    await tx`
      update customers set points_balance = ${newBalance} where id = ${customerId}
    `;

    return { transactionId: transaction.id, newBalance };
  });
}