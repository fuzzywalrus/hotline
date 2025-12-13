import { useNotificationStore } from '../../stores/notificationStore';
import Toast from './Toast';

export default function NotificationContainer() {
  const { activeNotifications, removeNotification } = useNotificationStore();

  if (activeNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {activeNotifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Toast
            notification={notification}
            onDismiss={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );
}

