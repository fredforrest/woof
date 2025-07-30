import PushNotification, { Importance } from 'react-native-push-notification';
import { Platform, PermissionsAndroid, AppState } from 'react-native';
import { notificationNavigationHandler } from './notificationNavigationHandler';

export interface NotificationData {
  roomId: string;
  roomName: string;
  messageId: string;
  senderId: string;
  senderName: string;
  messageText?: string;
  isPhoto?: boolean;
}

class NotificationManager {
  private isInitialized = false;
  private appState = AppState.currentState;
  private shouldShowNotificationCallback: ((roomId: string, senderId: string, currentUserId: string) => boolean) | null = null;

  constructor() {
    this.initializeAppStateListener();
  }

  private initializeAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      this.appState = nextAppState;
    });
  }

  // Set callback to determine if notification should be shown
  setShouldShowNotificationCallback(callback: (roomId: string, senderId: string, currentUserId: string) => boolean) {
    this.shouldShowNotificationCallback = callback;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions denied');
        return false;
      }

      // Configure push notifications
      PushNotification.configure({
        // Called when notification is opened
        onNotification: (notification: any) => {
          console.log('Notification opened:', notification);
          this.handleNotificationOpen(notification);
        },

        // Should the initial notification be popped automatically
        popInitialNotification: true,

        // Don't request permissions automatically - we do it manually above
        requestPermissions: false,
      });

      // Create notification channels for Android
      if (Platform.OS === 'android') {
        this.createNotificationChannels();
      }

      this.isInitialized = true;
      console.log('NotificationManager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize NotificationManager:', error);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // For iOS, we need to explicitly request permissions
      return new Promise((resolve) => {
        PushNotification.requestPermissions(['alert', 'badge', 'sound'])
          .then((permissions: any) => {
            console.log('iOS notification permissions granted:', permissions);
            resolve(permissions.alert || permissions.badge || permissions.sound);
          }).catch((error: any) => {
            console.error('iOS notification permission error:', error);
            resolve(false);
          });
      });
    } else if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true; // Android < 33 doesn't need runtime permission
    }
    return false;
  }

  private createNotificationChannels() {
    // Channel for new messages
    PushNotification.createChannel(
      {
        channelId: 'woof-messages',
        channelName: 'Chat Messages',
        channelDescription: 'Notifications for new chat messages',
        playSound: true,
        soundName: 'default',
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created: boolean) => console.log(`Message channel created: ${created}`)
    );

    // Channel for system notifications
    PushNotification.createChannel(
      {
        channelId: 'woof-system',
        channelName: 'System Notifications',
        channelDescription: 'System notifications and updates',
        playSound: true,
        soundName: 'default',
        importance: Importance.DEFAULT,
        vibrate: false,
      },
      (created: boolean) => console.log(`System channel created: ${created}`)
    );
  }

  private handleNotificationOpen(notification: any) {
    const userInfo = notification.userInfo || notification.data;
    
    if (userInfo?.roomId && userInfo?.roomName) {
      // Navigate to the specific chat room
      console.log('Navigating to room from notification:', userInfo.roomId);
      notificationNavigationHandler.handleNotificationNavigation(
        userInfo.roomId, 
        userInfo.roomName
      );
    }
  }

  shouldShowNotification(roomId: string, senderId: string, currentUserId: string): boolean {
    // Don't show notification for own messages
    if (senderId === currentUserId) return false;
    
    // Use callback if available (for active room detection)
    if (this.shouldShowNotificationCallback) {
      return this.shouldShowNotificationCallback(roomId, senderId, currentUserId);
    }
    
    // Fallback: Only show when app is in background or inactive
    return this.appState === 'background' || this.appState === 'inactive';
  }

  showMessageNotification(data: NotificationData, currentUserId: string) {
    if (!this.isInitialized) {
      console.warn('❌ NotificationManager not initialized');
      return;
    }

    console.log('🔔 NotificationManager.showMessageNotification called with:', {
      roomId: data.roomId,
      senderId: data.senderId,
      senderName: data.senderName,
      roomName: data.roomName
    });

    // For test messages (senderId starts with 'test-'), always show notification
    const isTestMessage = data.senderId.startsWith('test-');
    const shouldShow = isTestMessage || this.shouldShowNotification(data.roomId, data.senderId, currentUserId);
    
    console.log('🔔 Should show notification:', shouldShow, isTestMessage ? '(test message)' : '');

    if (!shouldShow) {
      console.log('❌ Skipping notification - user in active room or own message');
      return;
    }

    const message = data.isPhoto ? '📷 Photo' : (data.messageText || 'New message');
    const title = `${data.senderName} in ${data.roomName}`;

    PushNotification.localNotification({
      /* Android Only Properties */
      channelId: 'woof-messages',
      ticker: 'New message received',
      showWhen: true,
      autoCancel: true,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      bigText: message,
      subText: `From ${data.roomName}`,
      bigLargeIcon: 'ic_launcher',
      color: '#007AFF',
      vibrate: true,
      vibration: 300,
      tag: `room_${data.roomId}`, // Group notifications by room
      group: 'woof_messages',
      ongoing: false,
      priority: 'high',
      visibility: 'public',
      importance: 'high',

      /* iOS and Android properties */
      id: Date.now(), // Unique notification ID
      title: title,
      message: message,
      playSound: true,
      soundName: 'default',
      number: 1,

      /* User info for handling notification taps */
      userInfo: {
        roomId: data.roomId,
        roomName: data.roomName,
        messageId: data.messageId,
        senderId: data.senderId,
      },

      /* iOS only properties */
      category: 'MESSAGE_CATEGORY',
    });

    console.log(`✅ Notification successfully sent: ${title} - ${message}`);
  }

  showSystemNotification(title: string, message: string, data?: any) {
    if (!this.isInitialized) return;

    PushNotification.localNotification({
      channelId: 'woof-system',
      id: Date.now(),
      title: title,
      message: message,
      playSound: true,
      soundName: 'default',
      userInfo: data || {},
      priority: 'default',
      importance: 'default',
    });
  }

  cancelNotification(notificationId: number) {
    PushNotification.cancelLocalNotification(notificationId.toString());
  }

  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  cancelRoomNotifications(roomId: string) {
    // For now, we'll just cancel all notifications
    // In a production app, you'd want to track notification IDs per room
    PushNotification.cancelAllLocalNotifications();
  }

  getDeliveredNotifications(callback: (notifications: any[]) => void) {
    PushNotification.getDeliveredNotifications(callback);
  }

  setApplicationIconBadgeNumber(number: number) {
    if (Platform.OS === 'ios') {
      PushNotification.setApplicationIconBadgeNumber(number);
    }
  }

  clearBadge() {
    this.setApplicationIconBadgeNumber(0);
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();
