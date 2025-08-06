# 🔔 Simple Notifee Notification Service

A simple notification service built with [Notifee](https://notifee.app/) for your React Native chat app.

## Features

✅ **Chat Message Notifications** - Rich notifications with reply actions
✅ **Friend Request Notifications** - Accept/decline actions  
✅ **Room Activity Notifications** - Join requests and invites
✅ **Simple Notifications** - Basic title/body notifications
✅ **Room-based Management** - Cancel notifications by room
✅ **App State Awareness** - Only shows when app is in background
✅ **Permission Handling** - Automatic permission requests
✅ **Cross-platform** - Works on iOS and Android

## Quick Start

### 1. Initialize in your App component

```tsx
import { NotificationService } from './app/services';

function App() {
  useEffect(() => {
    // Initialize notifications on app start
    NotificationService.initialize();
  }, []);

  return (
    // Your app content
  );
}
```

### 2. Use the hook in your components

```tsx
import { useNotifee } from './app/hooks';

const ChatScreen = ({ route }) => {
  const { roomId } = route.params;
  const { 
    showMessageNotification, 
    cancelRoomNotifications 
  } = useNotifee(roomId);

  // Show notification when new message arrives
  const handleNewMessage = (message) => {
    showMessageNotification(
      message.senderName,
      message.text,
      'Room Name',
      message.roomId,
      message.senderId
    );
  };

  return (
    // Your chat interface
  );
};
```

## API Reference

### NotificationService

#### Methods

- `initialize()` - Initialize the service and request permissions
- `showChatNotification()` - Show a chat message notification
- `showFriendRequestNotification()` - Show a friend request notification  
- `showRoomActivityNotification()` - Show room join/invite notifications
- `showSimpleNotification()` - Show a basic notification
- `cancelRoomNotifications(roomId)` - Cancel all notifications for a room
- `cancelAllNotifications()` - Cancel all notifications
- `areNotificationsEnabled()` - Check if notifications are enabled

### useNotifee Hook

#### Returns

- `isInitialized` - Whether the service is ready
- `appState` - Current app state ('active', 'background', 'inactive')
- `showMessageNotification()` - Show message notification (respects app state)
- `showFriendRequestNotification()` - Show friend request notification
- `showRoomActivityNotification()` - Show room activity notification
- `cancelRoomNotifications()` - Cancel room notifications
- `showSimpleNotification()` - Show simple notification

## Usage Examples

### Chat Messages
```tsx
// Only shows when app is in background
await showMessageNotification(
  'John Doe',           // sender name
  'Hello there!',       // message text  
  'General Chat',       // room name
  'room_123',          // room ID
  'user_456'           // sender ID
);
```

### Friend Requests
```tsx
await showFriendRequestNotification(
  'Jane Smith',    // requester name
  'user_789'       // requester ID
);
```

### Room Activities
```tsx
// Someone wants to join
await showRoomActivityNotification(
  'join_request',      // activity type
  'Mike Johnson',      // user name
  'Dog Lovers',        // room name
  'room_456',         // room ID
  'user_321'          // user ID
);

// Room invitation
await showRoomActivityNotification(
  'invite',           // activity type
  'Sarah Wilson',     // inviter name
  'Cat Lovers',       // room name
  'room_789',        // room ID
  'user_654'         // inviter ID
);
```

### Simple Notifications
```tsx
await showSimpleNotification(
  'Welcome!',
  'Thanks for joining our app!'
);
```

## Notification Channels (Android)

The service creates three notification channels:

- **chat_messages** - High priority for chat messages
- **friend_requests** - Default priority for friend requests  
- **room_activities** - Default priority for room activities

## Security Features

- ✅ Only authenticated users can receive notifications
- ✅ Users don't get notifications for their own messages
- ✅ Room-based filtering prevents unauthorized notifications
- ✅ App state awareness prevents spam when app is active
- ✅ Automatic cleanup when entering rooms

## Platform Notes

### iOS
- Requires notification permissions
- Uses notification categories for actions
- Supports rich notifications with attachments

### Android  
- Creates notification channels automatically
- Supports notification actions (reply, accept/decline)
- Respects system notification settings
- Uses proper importance levels

## Integration with Existing Code

To integrate with your existing Firebase listeners:

```tsx
// In your message listener
useEffect(() => {
  const unsubscribe = firestore()
    .collection('messages')
    .where('roomId', '==', roomId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const message = change.doc.data();
          
          // Show notification for new messages
          showMessageNotification(
            message.senderName,
            message.text,
            roomName,
            roomId,
            message.userId
          );
        }
      });
    });

  return unsubscribe;
}, [roomId]);
```

## Demo Component

Check out `app/components/NotificationDemo.tsx` for a complete working example of all notification types.

## Troubleshooting

**Notifications not showing?**
- Check if permissions are granted
- Verify app is in background/inactive state
- Check if user is authenticated
- Ensure notification channels are created (Android)

**Actions not working?**
- Verify event handlers are set up
- Check notification data payload
- Ensure proper navigation setup

## Next Steps

- [ ] Add navigation handling for notification taps
- [ ] Implement notification action handlers  
- [ ] Add notification preferences/settings
- [ ] Integrate with push notifications (FCM)
- [ ] Add notification badges
- [ ] Implement scheduled notifications
