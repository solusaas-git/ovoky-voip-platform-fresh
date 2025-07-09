// Service Worker for Push Notifications

const CACHE_NAME = 'ovo-notifications-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let notificationData;
  try {
    const rawData = event.data.text();
    notificationData = JSON.parse(rawData);
  } catch (error) {
    console.error('Error parsing push data:', error);
    notificationData = {
      title: 'New Notification',
      body: event.data.text() || 'You have a new notification',
      icon: '/icons/notification-icon.svg',
      badge: '/icons/notification-badge.svg'
    };
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icons/notification-icon.svg',
    badge: notificationData.badge || '/icons/notification-badge.svg',
    tag: notificationData.tag || 'default',
    data: notificationData.data || {},
    actions: notificationData.actions || [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    vibrate: notificationData.vibrate || [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .catch((error) => {
        console.error('Error displaying notification:', error);
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data;

  notification.close();

  if (action === 'dismiss') {
    // Just close the notification
    return;
  }

  // Handle view action or notification click
  const urlToOpen = data.actionUrl || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // If no existing window/tab, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );

  // Send message to client about notification interaction
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'NOTIFICATION_CLICKED',
          notificationId: data.notificationId,
          action: action,
          data: data
        });
      });
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);

  const notification = event.notification;
  const data = notification.data;

  // Send message to client about notification dismissal
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'NOTIFICATION_CLOSED',
          notificationId: data.notificationId,
          data: data
        });
      });
    })
  );
});

// Background sync for offline notification handling
self.addEventListener('sync', (event) => {
  if (event.tag === 'notification-sync') {
    event.waitUntil(
      // Sync notifications when back online
      syncNotifications()
    );
  }
});

async function syncNotifications() {
  try {
    // This would sync any pending notifications when back online
    console.log('Syncing notifications...');
    
    // Get stored notifications from IndexedDB or similar
    // Send them to the server
    // Update local state
    
  } catch (error) {
    console.error('Error syncing notifications:', error);
  }
}

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Fetch event - handle network requests (optional, for caching)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for notification-related caching
  if (event.request.url.includes('/api/notifications') && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before returning it
          const responseClone = response.clone();
          
          // Cache successful responses (only for GET requests)
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(event.request);
        })
    );
  }
}); 