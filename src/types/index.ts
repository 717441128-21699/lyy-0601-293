export type BillCategory = 'food' | 'transport' | 'ticket' | 'hotel' | 'other';

export type SplitType = 'equal' | 'ratio' | 'fixed';

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budgetPerPerson: number;
  createdAt: string;
}

export interface Member {
  id: string;
  tripId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface AdvancePayment {
  id: string;
  tripId: string;
  memberId: string;
  amount: number;
  note: string;
  createdAt: string;
}

export interface BillParticipant {
  id: string;
  billId: string;
  memberId: string;
  ratio: number;
  fixedAmount: number;
}

export interface Bill {
  id: string;
  tripId: string;
  category: BillCategory;
  amount: number;
  payerId: string;
  splitType: SplitType;
  note: string;
  date: string;
  createdAt: string;
  participants: BillParticipant[];
}

export interface Settlement {
  id: string;
  tripId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  settled: boolean;
  settledAt?: string;
}

export interface Transfer {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface MemberBalance {
  memberId: string;
  paid: number;
  shouldPay: number;
  advance: number;
  balance: number;
}

export interface CategoryStat {
  category: BillCategory;
  amount: number;
  count: number;
}
