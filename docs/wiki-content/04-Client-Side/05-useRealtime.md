# Client-Side: Subscribing with `useRealtime`

For features that require a persistent, real-time flow of data from the server—like live notifications, chat applications, or activity feeds—Igniter.js provides the **`useRealtime`** hook.

Unlike `useQuery`, which fetches data once and then caches it, `useRealtime` establishes a continuous subscription to a specific backend channel. It listens for messages pushed by the server and provides callbacks to react to them as they arrive.

## Backend Prerequisite

The `useRealtime` hook can only be used with backend `query` actions that have been explicitly marked as streamable by setting the `stream: true` option.

```typescript
// In your backend controller
export const notificationController = igniter.controller({
  path: '/notifications',
  actions: {
    stream: igniter.query({
      path: '/stream',
      // This property is required for useRealtime to work.
      stream: true,
      handler: async ({ response }) => {
        // This handler runs once when the client first connects.
        return response.success({ status: 'Connected' });
      }
    })
  }
});
```
This creates a dedicated real-time channel named `notifications.stream`.

---

## 1. Basic Usage

To subscribe to a stream, you access the hook via your `api` client and provide an `onMessage` callback to handle incoming data.

**Example: A Live Notification Feed**

```tsx
'use client';

import { api } from '@/igniter.client';
import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  text: string;
}

function NotificationFeed() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 1. Subscribe to the stream
  api.notifications.stream.useRealtime({
    // 2. This callback runs for every message sent by the server
    onMessage: (newNotification: Notification) => {
      console.log('New notification received:', newNotification);
      setNotifications((currentNotifications) => [
        newNotification,
        ...currentNotifications,
      ]);
    },
  });

  return (
    <div>
      <h3>Live Notifications</h3>
      <ul>
        {notifications.map((notif) => (
          <li key={notif.id}>{notif.text}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 2. Configuration Options (`RealtimeActionCallerOptions`)

You can customize the behavior of the stream by passing an options object to the `useRealtime` hook.

| Option                 | Description                                                                                       |
| :--------------------- | :------------------------------------------------------------------------------------------------ |
| `onMessage`            | **(Required)** A callback function that runs every time a new message is received from the server.      |
| `onConnect`            | A callback that runs once when the stream successfully connects to the server.                    |
| `onDisconnect`         | A callback that runs if the stream connection is lost.                                            |
| `onError`              | A callback that runs if an error occurs with the connection.                                      |
| `initialData`          | Provides an initial value for the `data` state before the first message arrives.                  |
| `initialParams`        | An object with `query` or `params` to initialize the stream connection.                           |
| `autoReconnect`        | If `true`, the client will automatically attempt to reconnect if the connection drops. (Default: `true`) |
| `maxReconnectAttempts` | The maximum number of times to try reconnecting.                                                  |
| `reconnectDelay`       | The delay in milliseconds between reconnection attempts.                                          |

**Example with more options:**

```tsx
api.activity.feed.useRealtime({
  initialParams: { query: { filter: 'all' } },
  onConnect: () => {
    showToast('Connected to activity feed!');
  },
  onMessage: (activity) => {
    addActivityToList(activity);
  },
  onError: (error) => {
    console.error('Stream connection error:', error);
    showErrorToast('Could not connect to live feed.');
  }
});
```

---

## 3. Return Values (`RealtimeActionCallerResult`)

The `useRealtime` hook returns an object with properties and functions to interact with the stream's state.

| Property         | Description                                                                     |
| :--------------- | :------------------------------------------------------------------------------ |
| `data`           | The most recent message received from the stream.                               |
| `isConnected`    | A boolean indicating if the stream is currently connected.                      |
| `isReconnecting` | A boolean indicating if the client is currently attempting to reconnect.        |
| `error`          | The last error object, if any.                                                  |
| `disconnect()`   | A function to manually close the stream connection.                             |
| `reconnect()`    | A function to manually attempt to reconnect a disconnected stream.              |

**Example: Displaying connection status and manual controls**

```tsx
function StreamControls() {
  const { isConnected, isReconnecting, disconnect, reconnect } = api.logs.stream.useRealtime({
    onMessage: (log) => console.log(log),
  });

  if (isReconnecting) {
    return <p>Connection lost. Reconnecting...</p>;
  }

  return (
    <div>
      <p>Stream Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={disconnect} disabled={!isConnected}>
        Disconnect
      </button>
      <button onClick={reconnect} disabled={isConnected}>
        Reconnect
      </button>
    </div>
  );
}
```

By combining these options and return values, `useRealtime` provides a complete and robust solution for building rich, real-time user experiences with Igniter.js.