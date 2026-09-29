import sql from '@/lib/db';

export type TransactionType = 'earn' | 'redeem' | 'adjustment';
export type AdjustmentDirection = 'add' | 'subtract';

export class PointsError extends Error {
  code:
    | 'invalid_type'
    | 'note_required'
    | 'direction_required'
    | 'customer_not_found'
    | 'insufficient_balance';
  constructor(code: PointsError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

interface ApplyTransactionInput {
  customerId: string;
  staffId: string;
  type: TransactionType;
  points: number; // always a positive magnitude
  note: string | null;
  /** Required when type is 'adjustment' — which way the correction goes. */
  direction?: AdjustmentDirection;
}

interface ApplyTransactionResult {
  transactionId: string;
  newBalance: number;
}

export async function applyTransaction(
  input: ApplyTransactionInput
): Promise<ApplyTransactionResult> {
  const { customerId, staffId, type, points, note, direction } = input;

  if (!['earn', 'redeem', 'adjustment'].includes(type)) {
    throw new PointsError('invalid_type', `"${type}" is not a valid transaction type`);
  }
  if ((type === 'redeem' || type === 'adjustment') && !note?.trim()) {
    throw new PointsError('note_required', 'note is required for redeem and adjustment');
  }
  if (!Number.isInteger(points) || points <= 0) {
    throw new PointsError('invalid_type', 'points must be a positive integer');
  }
  if (type === 'adjustment' && direction !== 'add' && direction !== 'subtract') {
    throw new PointsError(
      'direction_required',
      'direction ("add" or "subtract") is required for adjustment'
    );
  }

  let signedPoints: number;
  if (type === 'earn') {
    signedPoints = points;
  } else if (type === 'redeem') {
    signedPoints = -points;
  } else {
    signedPoints = direction === 'add' ? points : -points;
  }

  return sql.begin(async (tx) => {
    const [customer] = await tx<{ points_balance: number }[]>`
      select points_balance from customers where id = ${customerId} for update
    `;

    if (!customer) {
      throw new PointsError('customer_not_found', 'no customer with that id');
    }

    const newBalance = customer.points_balance + signedPoints;

    // Balance never goes negative, regardless of type — a subtracting
    // adjustment is held to the same floor as a redeem.
    if (newBalance < 0) {
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