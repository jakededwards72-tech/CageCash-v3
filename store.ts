import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BetSlipItem, SimSummary } from "./types";

interface DeskState {
  bankroll: number;
  kelly: number;
  simCount: number;
  slip: BetSlipItem[];
  cache: Record<string, SimSummary>;
  setBankroll: (n: number) => void;
  setKelly: (n: number) => void;
  setSimCount: (n: number) => void;
  putSim: (boutId: string, summary: SimSummary) => void;
  addBet: (bet: BetSlipItem) => void;
  removeBet: (id: string) => void;
  clearSlip: () => void;
  updateStake: (id: string, stake: number) => void;
}

export const useDesk = create<DeskState>()(
  persist(
    (set) => ({
      bankroll: 1000,
      kelly: 0.25,
      simCount: 8000,
      slip: [],
      cache: {},
      setBankroll: (bankroll) => set({ bankroll }),
      setKelly: (kelly) => set({ kelly }),
      setSimCount: (simCount) => set({ simCount }),
      putSim: (boutId, summary) =>
        set((s) => ({ cache: { ...s.cache, [boutId]: summary } })),
      addBet: (bet) =>
        set((s) => ({
          slip: s.slip.some((b) => b.id === bet.id) ? s.slip : [...s.slip, bet],
        })),
      removeBet: (id) => set((s) => ({ slip: s.slip.filter((b) => b.id !== id) })),
      clearSlip: () => set({ slip: [] }),
      updateStake: (id, stake) =>
        set((s) => ({
          slip: s.slip.map((b) => (b.id === id ? { ...b, stake } : b)),
        })),
    }),
    {
      name: "cageedge-desk",
      partialize: (s) => ({
        bankroll: s.bankroll,
        kelly: s.kelly,
        simCount: s.simCount,
        slip: s.slip,
      }),
      skipHydration: true,
    },
  ),
);
