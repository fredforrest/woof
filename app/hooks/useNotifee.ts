import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NotificationService } from '../services';
import auth from '@react-native-firebase/auth';

export const useNotifee = (currentRoomId?: string) => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize notifications when hook is first used
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!isInitialized) {
        const success = await NotificationService.initialize();
        setIsInitialized(success);
      }
    };

    initializeNotifications();
  }, [isInitialized]);

  // Track app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
      
      // Cancel notifications for current room when app becomes active
      if (nextAppState === 'active' && currentRoomId) {
        NotificationService.cancelRoomNotifications(currentRoomId);
      }
    });

    return () => subscription.remove();
  }, [currentRoomId]);

  // Show message notification (only when app is in background/inactive)
  const showMessageNotification = async (
    senderName: string,
    message: string,
    roomName: string,
    roomId: string,
    senderId: string,
    avatarUrl?: string
  ) => {
    // Don't show notifications when app is active or if it's user's own message
    if (appState === 'active') {
      return;
    }

    const currentUser = auth().currentUser;
    if (!currentUser || senderId === currentUser.uid) {
      return;
    }

    await NotificationService.showChatNotification(
      senderName,
      message,
      roomName,
      roomId,
      senderId,
      avatarUrl
    );
  };

  // Show friend request notification
  const showFriendRequestNotification = async (
    senderName: string,
    senderId: string,
    avatarUrl?: string
  ) => {
    await NotificationService.showFriendRequestNotification(senderName, senderId, avatarUrl);
  };

  // Show room activity notification
  const showRoomActivityNotification = async (
    activityType: 'join_request' | 'invite',
    userName: string,
    roomName: string,
    roomId: string,
    userId: string
  ) => {
    await NotificationService.showRoomActivityNotification(
      activityType,
      userName,
      roomName,
      roomId,
      userId
    );
  };

  // Cancel notifications for a specific room
  const cancelRoomNotifications = async (roomId: string) => {
    await NotificationService.cancelRoomNotifications(roomId);
  };

  // Show a notification
  const showNotification = async (title: string, body: string, data?: any) => {
    await NotificationService.showSimpleNotification(title, body, data);
  };

  return {
    isInitialized,
    appState,
    showMessageNotification,
    showFriendRequestNotification,
    showRoomActivityNotification,
    cancelRoomNotifications,
    showNotification,
  };
};
