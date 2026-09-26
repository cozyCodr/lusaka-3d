// Shared client state for the engine and the HUD (zustand, vanilla).
import { createStore } from 'zustand/vanilla';

export const MODES = ['map', 'fly', 'walk'];

export const store = createStore((set) => ({
  mode: 'map', // camera mode: map | fly | walk
  helpOpen: false,
  setMode: (mode) => set({ mode }),
  toggleHelp: (open) => set((s) => ({ helpOpen: open ?? !s.helpOpen })),
}));
