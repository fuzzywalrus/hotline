import { useNotificationStore, NotificationType } from '../../stores/notificationStore';

interface NotificationLogProps {
  onClose: () => void;
}

export default function NotificationLog({ onClose }: NotificationLogProps) {
  const { notificationHistory, clearHistory } = useNotificationStore();

  const getIcon = (type: NotificationType) => {
    switch (type) {
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

  const getTypeStyles = (type: NotificationType) => {
    const styles = {
      success: 'text-green-600 dark:text-green-400',
      error: 'text-red-600 dark:text-red-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      info: 'text-blue-600 dark:text-blue-400',
    };
    return styles[type];
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Notification Log
          </h2>
          <div className="flex items-center gap-2">
            {notificationHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Clear History
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {notificationHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...notificationHistory].reverse().map((notification) => (
                <div
                  key={notification.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold ${getTypeStyles(notification.type)}`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          {notification.title ? (
                            <div className="font-semibold text-sm text-gray-900 dark:text-white">
                              {notification.title}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-900 dark:text-white">
                              {notification.message}
                            </div>
                          )}
                          {notification.serverName && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                              {notification.serverName}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                      {notification.title && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {notification.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

