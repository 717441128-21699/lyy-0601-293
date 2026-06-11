import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, Member, Bill, AdvancePayment, Settlement } from '@/types';
import { generateId, todayStr } from '@/utils/id';
import { STORAGE_KEY, MEMBER_COLORS } from '@/constants';

interface AppState {
  trips: Trip[];
  currentTripId: string | null;
  members: Member[];
  bills: Bill[];
  advancePayments: AdvancePayment[];
  settlements: Settlement[];

  setCurrentTrip: (tripId: string | null) => void;

  addTrip: (data: Omit<Trip, 'id' | 'createdAt'>) => void;
  updateTrip: (id: string, data: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;

  addMember: (data: Omit<Member, 'id' | 'createdAt' | 'color'> & { color?: string }) => void;
  updateMember: (id: string, data: Partial<Member>) => void;
  deleteMember: (id: string) => void;

  addBill: (data: Omit<Bill, 'id' | 'createdAt'>) => void;
  updateBill: (id: string, data: Partial<Bill>) => void;
  deleteBill: (id: string) => void;

  addAdvancePayment: (data: Omit<AdvancePayment, 'id' | 'createdAt'>) => void;
  deleteAdvancePayment: (id: string) => void;

  markSettlement: (fromMemberId: string, toMemberId: string, amount: number, settled: boolean) => void;

  importData: (data: Partial<AppState>) => void;
  clearAllData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      trips: [],
      currentTripId: null,
      members: [],
      bills: [],
      advancePayments: [],
      settlements: [],

      setCurrentTrip: (tripId) => set({ currentTripId: tripId }),

      addTrip: (data) => {
        const newTrip: Trip = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          trips: [...state.trips, newTrip],
          currentTripId: newTrip.id,
        }));
      },

      updateTrip: (id, data) => {
        set((state) => ({
          trips: state.trips.map((t) => (t.id === id ? { ...t, ...data } : t)),
        }));
      },

      deleteTrip: (id) => {
        set((state) => ({
          trips: state.trips.filter((t) => t.id !== id),
          members: state.members.filter((m) => m.tripId !== id),
          bills: state.bills.filter((b) => b.tripId !== id),
          advancePayments: state.advancePayments.filter((a) => a.tripId !== id),
          settlements: state.settlements.filter((s) => s.tripId !== id),
          currentTripId: state.currentTripId === id ? null : state.currentTripId,
        }));
      },

      addMember: (data) => {
        const state = get();
        const existingCount = state.members.filter((m) => m.tripId === data.tripId).length;
        const color = data.color || MEMBER_COLORS[existingCount % MEMBER_COLORS.length];
        const newMember: Member = {
          ...data,
          color,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          members: [...state.members, newMember],
        }));
      },

      updateMember: (id, data) => {
        set((state) => ({
          members: state.members.map((m) => (m.id === id ? { ...m, ...data } : m)),
        }));
      },

      deleteMember: (id) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
          bills: state.bills.filter((b) => b.payerId !== id).map((b) => ({
            ...b,
            participants: b.participants.filter((p) => p.memberId !== id),
          })),
        }));
      },

      addBill: (data) => {
        const newBill: Bill = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
          date: data.date || todayStr(),
        };
        set((state) => ({
          bills: [...state.bills, newBill],
        }));
      },

      updateBill: (id, data) => {
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? { ...b, ...data } : b)),
        }));
      },

      deleteBill: (id) => {
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== id),
        }));
      },

      addAdvancePayment: (data) => {
        const newAdvance: AdvancePayment = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          advancePayments: [...state.advancePayments, newAdvance],
        }));
      },

      deleteAdvancePayment: (id) => {
        set((state) => ({
          advancePayments: state.advancePayments.filter((a) => a.id !== id),
        }));
      },

      markSettlement: (fromMemberId, toMemberId, amount, settled) => {
        const state = get();
        const tripId = state.currentTripId;
        if (!tripId) return;
        const existing = state.settlements.find(
          (s) =>
            s.tripId === tripId &&
            s.fromMemberId === fromMemberId &&
            s.toMemberId === toMemberId &&
            Math.abs(s.amount - amount) < 0.01
        );
        if (existing) {
          set((state) => ({
            settlements: state.settlements.map((s) =>
              s.id === existing.id ? { ...s, settled, settledAt: settled ? new Date().toISOString() : undefined } : s
            ),
          }));
        } else if (settled) {
          const newSettlement: Settlement = {
            id: generateId(),
            tripId,
            fromMemberId,
            toMemberId,
            amount,
            settled: true,
            settledAt: new Date().toISOString(),
          };
          set((state) => ({
            settlements: [...state.settlements, newSettlement],
          }));
        }
      },

      importData: (data) => {
        set({
          trips: data.trips || [],
          currentTripId: data.currentTripId || null,
          members: data.members || [],
          bills: data.bills || [],
          advancePayments: data.advancePayments || [],
          settlements: data.settlements || [],
        });
      },

      clearAllData: () => {
        set({
          trips: [],
          currentTripId: null,
          members: [],
          bills: [],
          advancePayments: [],
          settlements: [],
        });
      },
    }),
    {
      name: STORAGE_KEY,
    }
  )
);
