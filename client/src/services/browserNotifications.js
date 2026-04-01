export const isBrowserNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

export const requestBrowserNotificationPermission = async () => {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  return Notification.requestPermission();
};

export const showBrowserNotification = async ({ title, body, tag, data }) => {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      tag,
      renotify: true,
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      data,
    });
    return true;
  } catch (error) {
    console.error('Browser notification failed:', error);
    return false;
  }
};
