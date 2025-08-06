import notifee, { 
  AndroidImportance, 
  AndroidVisibility, 
  AndroidCategory,
  AuthorizationStatus,
  EventType
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { BaseService } from './baseService';

export interface NotificationData {
  type: 'message' | 'friend_request' | 'room_activity';
  roomId?: string;
  senderId: string;
  senderName: string;
  title: string;
  body: string;
  avatarUrl?: string;
}

export class NotificationService extends BaseService {
  private static initialized = false;

  // Initialize notification service
  static async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      console.log('🔔 Initializing Notifee...');

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('❌ Notification permissions denied');
        return false;
      }

      // Create notification channels for Android
      if (Platform.OS === 'android') {
        await this.createChannels();
      }

      // Setup notification event handlers
      this.setupEventHandlers();

      this.initialized = true;
      console.log('✅ Notifee initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Notifee:', error);
      return false;
    }
  }

  // Request notification permissions
  private static async requestPermissions(): Promise<boolean> {
    try {
      const settings = await notifee.requestPermission();
      return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  }

  // Create notification channels for Android
  private static async createChannels(): Promise<void> {
    try {
      // Chat messages channel
      await notifee.createChannel({
        id: 'chat_messages',
        name: 'Chat Messages',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PRIVATE,
        sound: 'default',
        vibration: true,
        badge: true,
      });

      // Friend requests channel
      await notifee.createChannel({
        id: 'friend_requests',
        name: 'Friend Requests',
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
        vibration: true,
      });

      // Room activities channel
      await notifee.createChannel({
        id: 'room_activities',
        name: 'Room Activities',
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
      });

      console.log('✅ Notification channels created');
    } catch (error) {
      console.error('❌ Failed to create channels:', error);
    }
  }

  // Setup notification event handlers
  private static setupEventHandlers(): void {
    // Handle foreground notification events
    notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        const data = detail.notification?.data;
        console.log('📱 Notification pressed:', data);
        
        // Handle different notification types
        if (data?.type === 'message' && data?.roomId) {
          console.log('📱 Opening chat room:', data.roomId);
          // TODO: Navigate to chat room
        } else if (data?.type === 'friend_request') {
          console.log('📱 Opening friend requests');
          // TODO: Navigate to friend requests
        }
      }
    });

    // Handle background notification events
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      console.log('📱 Background notification event:', type);
      // Handle background events if needed
    });
  }

  // Show a chat message notification
  static async showChatNotification(
    senderName: string,
    message: string,
    roomName: string,
    roomId: string,
    senderId: string,
    avatarUrl?: string
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const notificationId = `chat_${roomId}_${Date.now()}`;

      await notifee.displayNotification({
        id: notificationId,
        title: `💬 ${roomName}`,
        body: `${senderName}: ${message}`,
        data: {
          type: 'message',
          roomId,
          senderId,
        },
        android: {
          channelId: 'chat_messages',
          importance: AndroidImportance.HIGH,
          category: AndroidCategory.MESSAGE,
          visibility: AndroidVisibility.PRIVATE,
          pressAction: {
            id: 'open_chat',
            launchActivity: 'default',
          },
          actions: [
            {
              title: 'Reply',
              pressAction: { id: 'reply' },
              input: {
                allowFreeFormInput: true,
                placeholder: 'Type a message...',
              },
            },
            {
              title: 'Mark as Read',
              pressAction: { id: 'mark_read' },
            },
          ],
        },
        ios: {
          categoryId: 'chat_message',
        },
      });

      console.log(`✅ Chat notification shown for room: ${roomName}`);
    } catch (error) {
      console.error('❌ Failed to show chat notification:', error);
    }
  }

  // Show a friend request notification
  static async showFriendRequestNotification(
    senderName: string,
    senderId: string,
    avatarUrl?: string
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const notificationId = `friend_request_${senderId}_${Date.now()}`;

      await notifee.displayNotification({
        id: notificationId,
        title: '👥 New Friend Request',
        body: `${senderName} wants to be your friend`,
        data: {
          type: 'friend_request',
          senderId,
        },
        android: {
          channelId: 'friend_requests',
          importance: AndroidImportance.DEFAULT,
          pressAction: {
            id: 'open_friend_requests',
            launchActivity: 'default',
          },
          actions: [
            {
              title: '✅ Accept',
              pressAction: { id: 'accept_friend' },
            },
            {
              title: '❌ Decline',
              pressAction: { id: 'decline_friend' },
            },
          ],
        },
        ios: {
          categoryId: 'friend_request',
        },
      });

      console.log(`✅ Friend request notification shown from: ${senderName}`);
    } catch (error) {
      console.error('❌ Failed to show friend request notification:', error);
    }
  }

  // Show a room activity notification (someone wants to join)
  static async showRoomActivityNotification(
    activityType: 'join_request' | 'invite',
    userName: string,
    roomName: string,
    roomId: string,
    userId: string
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const notificationId = `room_activity_${roomId}_${userId}_${Date.now()}`;
      const title = activityType === 'join_request' 
        ? '🏠 Room Join Request' 
        : '🎉 Room Invite';
      const body = activityType === 'join_request'
        ? `${userName} wants to join "${roomName}"`
        : `You've been invited to "${roomName}"`;

      await notifee.displayNotification({
        id: notificationId,
        title,
        body,
        data: {
          type: 'room_activity',
          roomId,
          userId,
          activityType,
        },
        android: {
          channelId: 'room_activities',
          importance: AndroidImportance.DEFAULT,
          pressAction: {
            id: 'open_room',
            launchActivity: 'default',
          },
          actions: activityType === 'join_request' ? [
            {
              title: '✅ Approve',
              pressAction: { id: 'approve_join' },
            },
            {
              title: '❌ Deny',
              pressAction: { id: 'deny_join' },
            },
          ] : [
            {
              title: '✅ Join',
              pressAction: { id: 'join_room' },
            },
            {
              title: '❌ Decline',
              pressAction: { id: 'decline_invite' },
            },
          ],
        },
        ios: {
          categoryId: 'room_activity',
        },
      });

      console.log(`✅ Room activity notification shown: ${activityType} for ${roomName}`);
    } catch (error) {
      console.error('❌ Failed to show room activity notification:', error);
    }
  }

  // Cancel notifications for a specific room
  static async cancelRoomNotifications(roomId: string): Promise<void> {
    try {
      const notifications = await notifee.getDisplayedNotifications();
      
      for (const notification of notifications) {
        if (notification.notification?.data?.roomId === roomId && notification.id) {
          await notifee.cancelNotification(notification.id);
        }
      }

      console.log(`✅ Cancelled notifications for room: ${roomId}`);
    } catch (error) {
      console.error('❌ Failed to cancel room notifications:', error);
    }
  }

  // Cancel all notifications
  static async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
      console.log('✅ All notifications cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel all notifications:', error);
    }
  }

  // Check if notifications are enabled
  static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const settings = await notifee.getNotificationSettings();
      return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    } catch (error) {
      console.error('❌ Failed to check notification settings:', error);
      return false;
    }
  }

  // Show a simple notification
  static async showSimpleNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId: 'room_activities',
          importance: AndroidImportance.DEFAULT,
        },
      });

      console.log(`✅ Simple notification shown: ${title}`);
    } catch (error) {
      console.error('❌ Failed to show simple notification:', error);
    }
  }
}
