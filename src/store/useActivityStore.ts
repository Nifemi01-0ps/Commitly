/**
 * useActivityStore.ts
 *
 * Centralized global activity feed.
 * All meaningful events are logged here.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivityType =
  | "complete"
  | "fail"
  | "join"
  | "create"
  | "award"
  | "streak";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  userId: string;
  userInitials: string;
  userColor: string;
  planTitle: string;
  planId?: string;
  timestamp: string;
  meta?: {
    creditDelta?: number;
    participantCount?: number;
    streakCount?: number;
  };
}

interface ActivityStore {
  events: ActivityEvent[];
  push: (event: Omit<ActivityEvent, "id" | "timestamp">) => void;
  clear: () => void;
  clearOldEvents: (daysOld?: number) => void;
}

// Seed data (only used if store is empty)
const SEED_EVENTS: ActivityEvent[] = [
  // ... (your existing seeds)
];

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set, get) => ({
      events: SEED_EVENTS,

      push: (eventData) => {
        const newEvent: ActivityEvent = {
          ...eventData,
          id: `ae-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          events: [newEvent, ...state.events].slice(0, 100), // Keep newest 100
        }));
      },

      clear: () => set({ events: [] }),

      // Optional: clean up very old events
      clearOldEvents: (daysOld = 30) => {
        const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
        set((state) => ({
          events: state.events.filter(
            (e) => new Date(e.timestamp).getTime() > cutoff
          ),
        }));
      },
    }),

    {
      name: "commitly-activity",
      // Optional: partial persistence
      partialize: (state) => ({ events: state.events }),
    }
  )
);