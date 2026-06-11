import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { calculateMemberBalances, calculateTransfers, calculateTotalExpense } from '@/utils/calculation';

export function useCurrentTrip() {
  const { trips, currentTripId, members, bills, advancePayments, settlements } = useStore();

  const currentTrip = useMemo(
    () => trips.find((t) => t.id === currentTripId) || null,
    [trips, currentTripId]
  );

  const tripMembers = useMemo(
    () => members.filter((m) => m.tripId === currentTripId),
    [members, currentTripId]
  );

  const tripBills = useMemo(
    () => bills.filter((b) => b.tripId === currentTripId),
    [bills, currentTripId]
  );

  const tripAdvances = useMemo(
    () => advancePayments.filter((a) => a.tripId === currentTripId),
    [advancePayments, currentTripId]
  );

  const tripSettlements = useMemo(
    () => settlements.filter((s) => s.tripId === currentTripId),
    [settlements, currentTripId]
  );

  const memberBalances = useMemo(
    () => calculateMemberBalances(tripMembers, tripBills, tripAdvances),
    [tripMembers, tripBills, tripAdvances]
  );

  const transfers = useMemo(
    () => calculateTransfers(memberBalances),
    [memberBalances]
  );

  const totalExpense = useMemo(
    () => calculateTotalExpense(tripBills),
    [tripBills]
  );

  const memberMap = useMemo(() => {
    const map: Record<string, typeof tripMembers[number]> = {};
    tripMembers.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [tripMembers]);

  return {
    currentTrip,
    tripMembers,
    tripBills,
    tripAdvances,
    tripSettlements,
    memberBalances,
    transfers,
    totalExpense,
    memberMap,
  };
}
