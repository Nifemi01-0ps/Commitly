/**
 * useNotifStore.ts
 *
 * Global notification center. 
 * Used by NotificationBell and various background services.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotifType =
  | "plan_starting"
  | "proof_due"
  | "missed"
  | "credits_earned"
  | "credits_lost"
  | "joined"
  | "completed";

export interface Notification {
  id: string;
  type: NotifType;
  message: string;
  planId?: string;
  read: boolean;
  timestamp: string;
}

interface NotifStore {
  notifications: Notification[];
  unreadCount: number;

  push: (notif: Omit<Notification, "id" | "read" | "timestamp">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

// Seed notifications (for demo / new users)
const SEED_NOTIFS: Notification[] = [
  // ... your existing seeds
];

export const useNotifStore = create<NotifStore>()(
  persist(
    (set, get) => ({
      notifications: SEED_NOTIFS,
      unreadCount: SEED_NOTIFS.filter((n) => !n.read).length,

      push: (notifData) => {
        const newNotif: Notification = {
          ...notifData,
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          read: false,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          notifications: [newNotif, ...state.notifications].slice(0, 50),
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      markRead: (id) =>
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
          };
        }),

      dismiss: (id) =>
        set((state) => {
          const updated = state.notifications.filter((n) => n.id !== id);
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
          };
        }),

      clearAll: () => set({ notifications: [], unreadCount: 0 }),
    }),

    {
      name: "commitly-notifications",
      partialize: (state) => ({ notifications: state.notifications }),
    }
  )
);