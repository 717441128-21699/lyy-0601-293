import { Bill, Member, MemberBalance, Transfer, AdvancePayment, BillCategory, CategoryStat } from '@/types';
import { round2 } from './id';

export function calculateBillShares(bill: Bill): Record<string, number> {
  const shares: Record<string, number> = {};

  if (bill.splitType === 'equal') {
    const count = bill.participants.length;
    if (count === 0) return shares;
    const perPerson = round2(bill.amount / count);
    let diff = round2(bill.amount - perPerson * count);
    bill.participants.forEach((p, idx) => {
      shares[p.memberId] = idx === 0 ? round2(perPerson + diff) : perPerson;
    });
  } else if (bill.splitType === 'ratio') {
    bill.participants.forEach((p) => {
      shares[p.memberId] = round2(bill.amount * p.ratio);
    });
  } else if (bill.splitType === 'fixed') {
    bill.participants.forEach((p) => {
      shares[p.memberId] = p.fixedAmount;
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
