import { useEffect, useState } from 'react';
import { Notification } from '../../stores/notificationStore';

interface ToastProps {
  notification: Notification;
  onDismiss: () => void;
}

export default function Toast({ notification, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss();
    }, 300); // Match animation duration
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  const getStyles = () => {
    const baseStyles = 'rounded-lg shadow-lg border p-4 min-w-[300px] max-w-[400px] transition-all duration-300';
    const typeStyles = {
      success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
      error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    };
    
    const visibilityStyles = isLeaving
      ? 'opacity-0 translate-x-full'
      : isVisible
      ? 'opacity-100 translate-x-0'
      : 'opacity-0 translate-x-full';
    
    return `${baseStyles} ${typeStyles[notification.type]} ${visibilityStyles}`;
  };

  return (
    <div className={getStyles()}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-sm font-bold">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {notification.title && (
            <div className="font-semibold text-sm mb-1">{notification.title}</div>
          )}
          <div className="text-sm">{notification.message}</div>
          {notification.action && (
            <button
              onClick={() => {
                notification.action?.onClick();
                handleDismiss();
              }}
              className="mt-2 text-xs font-medium underline hover:no-underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

