import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import auth from '@react-native-firebase/auth';
import { notificationManager, NotificationData } from '../utils/notificationManager';
import { Message } from './useMessages';
import { useActiveRoom } from '../contexts/ActiveRoomContext';

interface UseNotificationsReturn {
  isInitialized: boolean;
  appState: AppStateStatus;
  showMessageNotification: (message: Message, roomName: string) => void;
  showSystemNotification: (title: string, message: string, data?: any) => void;
  cancelRoomNotifications: (roomId: string) => void;
  clearBadge: () => void;
}

export const useNotifications = (roomId?: string): UseNotificationsReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const currentUser = auth().currentUser;
  const initializationAttempted = useRef(false);
  const { isUserInRoom, appState: contextAppState } = useActiveRoom();

  // Set up notification callback that considers active room
  useEffect(() => {
    const shouldShowNotificationCallback = (messageRoomId: string, senderId: string, currentUserId: string): boolean => {
      // Don't show notification for own messages
      if (senderId === currentUserId) {
        return false;
      }
      
      // Always show when app is completely backgrounded
      if (contextAppState === 'background' || contextAppState === 'inactive') {
        return true;
      }
      
      // When app is active, only show if user is NOT in the room where message was sent
      if (contextAppState === 'active') {
        const userInRoom = isUserInRoom(messageRoomId);
        return !userInRoom;
      }
      
      return false;
    };

    notificationManager.setShouldShowNotificationCallback(shouldShowNotificationCallback);
  }, [isUserInRoom, contextAppState]);

  // Initialize notification manager
  useEffect(() => {
    const initializeNotifications = async () => {
      if (initializationAttempted.current) return;
      initializationAttempted.current = true;

      try {
        const initialized = await notificationManager.initialize();
        setIsInitialized(initialized);
        
        if (initialized) {
          console.log('Notifications initialized successfully');
        } else {
          console.warn('Failed to initialize notifications');
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
        setIsInitialized(false);
      }
    };

    initializeNotifications();
  }, []);

  // Clear notifications when entering active room
  useEffect(() => {
    if (contextAppState === 'active' && roomId) {
      notificationManager.cancelRoomNotifications(roomId);
    }
  }, [contextAppState, roomId]);

  const showMessageNotification = (message: Message, roomName: string) => {
    if (!isInitialized || !currentUser) {
      console.log('Notifications not initialized or user not authenticated');
      return;
    }

    const notificationData: NotificationData = {
      roomId: roomId || 'unknown',
      roomName: roomName,
      messageId: message.id,
      senderId: message.userId,
      senderName: message.senderName || 'Unknown User',
      messageText: message.text,
      isPhoto: !!message.photoURL,
    };

    console.log('Attempting to show notification for message:', notificationData);
    notificationManager.showMessageNotification(notificationData, currentUser.uid);
  };

  const showSystemNotification = (title: string, message: string, data?: any) => {
    if (!isInitialized) return;
    notificationManager.showSystemNotification(title, message, data);
  };

  const cancelRoomNotifications = (targetRoomId: string) => {
    if (!isInitialized) return;
    notificationManager.cancelRoomNotifications(targetRoomId);
  };

  const clearBadge = () => {
    if (!isInitialized) return;
    notificationManager.clearBadge();
  };

  return {
    isInitialized,
    appState: contextAppState,
    showMessageNotification,
    showSystemNotification,
    cancelRoomNotifications,
    clearBadge,
  };
};
