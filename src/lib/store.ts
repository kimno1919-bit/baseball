import { create } from "zustand";

interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

interface AppState {
  darkMode: "light" | "dark";
  notifications: NotificationItem[];
  unreadCount: number;
  setDarkMode: (mode: "light" | "dark") => void;
  toggleDarkMode: () => void;
  fetchNotifications: () => Promise<void>;
  readNotification: (id: string) => Promise<void>;
  readAllNotifications: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  darkMode: "light",
  notifications: [],
  unreadCount: 0,

  setDarkMode: (mode) => {
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      if (mode === "dark") {
        root.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        root.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    }
    set({ darkMode: mode });
  },

  toggleDarkMode: () => {
    const nextMode = get().darkMode === "light" ? "dark" : "light";
    get().setDarkMode(nextMode);
  },

  fetchNotifications: async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const unread = data.filter((n: NotificationItem) => !n.isRead).length;
        set({ notifications: data, unreadCount: unread });
      }
    } catch (error) {
      console.error("알림 조회 실패:", error);
    }
  },

  readNotification: async (id) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        // 목록 갱신
        const updatedList = get().notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        const unread = updatedList.filter((n) => !n.isRead).length;
        set({ notifications: updatedList, unreadCount: unread });
      }
    } catch (error) {
      console.error("알림 읽음 처리 실패:", error);
    }
  },

  readAllNotifications: async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true }),
      });
      if (res.ok) {
        const updatedList = get().notifications.map((n) => ({ ...n, isRead: true }));
        set({ notifications: updatedList, unreadCount: 0 });
      }
    } catch (error) {
      console.error("전체 알림 읽음 처리 실패:", error);
    }
  },
}));
