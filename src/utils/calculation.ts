import { Bill, Member, MemberBalance, Transfer, AdvancePayment, BillCategory, CategoryStat } from '@/types';
import { round2 } from './id';

export interface SplitValidationResult {
  valid: boolean;
  total: number;
  diff: number;
  message?: string;
}

export function validateSplit(
  splitType: 'equal' | 'ratio' | 'fixed',
  amount: number,
  participants: { memberId: string; ratio: number; fixedAmount: number; weight?: number }[]
): SplitValidationResult {
  if (participants.length === 0) {
    return { valid: false, total: 0, diff: amount, message: '请选择参与人' };
  }

  if (splitType === 'equal') {
    return { valid: true, total: amount, diff: 0 };
  }

  if (splitType === 'ratio') {
    const weights = participants.map((p) => p.weight ?? p.ratio ?? 1);
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    if (totalWeight <= 0) {
      return { valid: false, total: 0, diff: amount, message: '权重总和必须大于0' };
    }
    return { valid: true, total: amount, diff: 0 };
  }

  if (splitType === 'fixed') {
    const total = participants.reduce((s, p) => s + (p.fixedAmount || 0), 0);
    const diff = round2(amount - total);
    if (Math.abs(diff) > 0.01) {
      return {
        valid: false,
        total: round2(total),
        diff,
        message: `分摊金额合计${round2(total)}元，与账单金额${round2(amount)}元相差${Math.abs(diff)}元`,
      };
    }
    return { valid: true, total: round2(total), diff: 0 };
  }

  return { valid: true, total: amount, diff: 0 };
}

export function calculateBillShares(bill: Bill): Record<string, number> {
  const shares: Record<string, number> = {};
  const count = bill.participants.length;
  if (count === 0) return shares;
  const amount = round2(bill.amount);

  if (bill.splitType === 'equal') {
    const perPerson = round2(amount / count);
    const diff = round2(amount - perPerson * count);
    bill.participants.forEach((p, idx) => {
      shares[p.memberId] = idx === 0 ? round2(perPerson + diff) : perPerson;
    });
  } else if (bill.splitType === 'ratio') {
    const weights = bill.participants.map((p) => p.ratio > 0 ? p.ratio : 1);
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    if (totalWeight <= 0) {
      const perPerson = round2(amount / count);
      const diff = round2(amount - perPerson * count);
      bill.participants.forEach((p, idx) => {
        shares[p.memberId] = idx === 0 ? round2(perPerson + diff) : perPerson;
      });
    } else {
      const rawShares = bill.participants.map((p, idx) => {
        const w = weights[idx];
        return round2(amount * (w / totalWeight));
      });
      const rawTotal = rawShares.reduce((s, v) => s + v, 0);
      const diff = round2(amount - rawTotal);
      bill.participants.forEach((p, idx) => {
        shares[p.memberId] = idx === 0 ? round2(rawShares[idx] + diff) : rawShares[idx];
      });
    }
  } else if (bill.splitType === 'fixed') {
    const rawShares = bill.participants.map((p) => round2(p.fixedAmount || 0));
    const rawTotal = rawShares.reduce((s, v) => s + v, 0);
    const diff = round2(amount - rawTotal);
    bill.participants.forEach((p, idx) => {
      shares[p.memberId] = idx === 0 ? round2(rawShares[idx] + diff) : rawShares[idx];
    });
  }

  return shares;
}

export function calculateMemberBalances(
  members: Member[],
  bills: Bill[],
  advances: AdvancePayment[]
): MemberBalance[] {
  const balances: MemberBalance[] = members.map((m) => ({
    memberId: m.id,
    paid: 0,
    shouldPay: 0,
    advance: 0,
    balance: 0,
  }));

  const balanceMap: Record<string, MemberBalance> = {};
  balances.forEach((b) => {
    balanceMap[b.memberId] = b;
  });

  bills.forEach((bill) => {
    if (balanceMap[bill.payerId]) {
      balanceMap[bill.payerId].paid = round2(balanceMap[bill.payerId].paid + bill.amount);
    }
    const shares = calculateBillShares(bill);
    Object.entries(shares).forEach(([memberId, amount]) => {
      if (balanceMap[memberId]) {
        balanceMap[memberId].shouldPay = round2(balanceMap[memberId].shouldPay + amount);
      }
    });
  });

  advances.forEach((a) => {
    if (balanceMap[a.memberId]) {
      balanceMap[a.memberId].advance = round2(balanceMap[a.memberId].advance + a.amount);
    }
  });

  balances.forEach((b) => {
    b.balance = round2(b.paid + b.advance - b.shouldPay);
  });

  return balances;
}

export function calculateTransfers(balances: MemberBalance[]): Transfer[] {
  const debtors: { memberId: string; amount: number }[] = [];
  const creditors: { memberId: string; amount: number }[] = [];

  balances.forEach((b) => {
    if (b.balance < -0.01) {
      debtors.push({ memberId: b.memberId, amount: Math.abs(b.balance) });
    } else if (b.balance > 0.01) {
      creditors.push({ memberId: b.memberId, amount: b.balance });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0.01) {
      transfers.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount: round2(amount),
      });
    }
    debtor.amount = round2(debtor.amount - amount);
    creditor.amount = round2(creditor.amount - amount);
    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return transfers;
}

export function calculateCategoryStats(bills: Bill[]): CategoryStat[] {
  const statsMap: Record<BillCategory, CategoryStat> = {
    food: { category: 'food', amount: 0, count: 0 },
    transport: { category: 'transport', amount: 0, count: 0 },
    ticket: { category: 'ticket', amount: 0, count: 0 },
    hotel: { category: 'hotel', amount: 0, count: 0 },
    other: { category: 'other', amount: 0, count: 0 },
  };

  bills.forEach((bill) => {
    statsMap[bill.category].amount = round2(statsMap[bill.category].amount + bill.amount);
    statsMap[bill.category].count += 1;
  });

  return Object.values(statsMap).filter((s) => s.count > 0);
}

export function calculateTotalExpense(bills: Bill[]): number {
  return round2(bills.reduce((sum, b) => sum + b.amount, 0));
}
