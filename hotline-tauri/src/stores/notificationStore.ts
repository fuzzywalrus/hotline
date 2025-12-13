import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  timestamp: Date;
  duration?: number; // Auto-dismiss duration in ms (default: 5000)
  serverName?: string; // Server name for context
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationState {
  activeNotifications: Notification[];
  notificationHistory: Notification[];
  maxHistorySize: number;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearActiveNotifications: () => void;
  clearHistory: () => void;
  setMaxHistorySize: (size: number) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      activeNotifications: [],
      notificationHistory: [],
      maxHistorySize: 100, // Keep last 100 notifications
      
      addNotification: (notification) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: new Date(),
          duration: notification.duration ?? 5000,
        };
        
        set((state) => {
          // Add to active notifications
          const activeNotifications = [...state.activeNotifications, newNotification];
          
          // Add to history (with size limit)
          const notificationHistory = [
            ...state.notificationHistory,
            newNotification,
          ].slice(-state.maxHistorySize);
          
          return {
            activeNotifications,
            notificationHistory,
          };
        });
        
        // Auto-remove after duration
        if (newNotification.duration && newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }
      },
      
      removeNotification: (id) => {
        set((state) => ({
          activeNotifications: state.activeNotifications.filter((n) => n.id !== id),
        }));
      },
      
      clearActiveNotifications: () => {
        set({ activeNotifications: [] });
      },
      
      clearHistory: () => {
        set({ notificationHistory: [] });
      },
      
      setMaxHistorySize: (size) => {
        set((state) => {
          const maxSize = Math.max(10, Math.min(1000, size)); // Clamp between 10 and 1000
          return {
            maxHistorySize: maxSize,
            notificationHistory: state.notificationHistory.slice(-maxSize),
          };
        });
      },
    }),
    {
      name: 'hotline-notifications',
      storage: createJSONStorage(() => localStorage),
      // Only persist history, not active notifications
      partialize: (state) => ({
        notificationHistory: state.notificationHistory,
        maxHistorySize: state.maxHistorySize,
      }),
    }
  )
);

// Helper functions for common notification types
export const showNotification = {
  success: (message: string, title?: string, duration?: number, serverName?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      message,
      title,
      duration,
      serverName,
    });
  },
  
  error: (message: string, title?: string, duration?: number, serverName?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      message,
      title,
      duration: duration ?? 7000, // Errors stay longer
      serverName,
    });
  },
  
  info: (message: string, title?: string, duration?: number, serverName?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      message,
      title,
      duration,
      serverName,
    });
  },
  
  warning: (message: string, title?: string, duration?: number, serverName?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      message,
      title,
      duration,
      serverName,
    });
  },
};

