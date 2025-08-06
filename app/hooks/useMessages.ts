import { useState, useEffect, useRef } from 'react';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Alert } from 'react-native';
import { getCurrentUser, canUserAccessRoom, logSecurityEvent, handleSecureError } from '../utils/security';
import { useNotifications } from './useNotifications';
import { ChatService, Message } from '../services';

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMoreMessages: () => Promise<void>;
  flatListRef: React.RefObject<any>;
  roomName: string;
}

export const useMessages = (roomId: string): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<FirebaseFirestoreTypes.DocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [roomName, setRoomName] = useState<string>('');
  const flatListRef = useRef<any>(null);

  // Init notifications for this room
  const { showMessageNotification, cancelRoomNotifications, appState } = useNotifications(roomId);

  // Load more messages function
  const loadMoreMessages = async () => {
    if (!roomId || !lastVisible || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    try {
      const result = await ChatService.loadMoreMessages(roomId, lastVisible, 50);
      
      if (result.messages.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg.id));
          const uniqueNewMessages = result.messages.filter(msg => !existingIds.has(msg.id));
          return [...uniqueNewMessages, ...prev];
        });
        setLastVisible(result.lastVisible);
      }
      
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error loading more messages:', error);
      Alert.alert('Error', 'Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Clear notifications when entering room (app becomes active)
  useEffect(() => {
    if (appState === 'active' && roomId) {
      cancelRoomNotifications(roomId);
    }
  }, [appState, roomId, cancelRoomNotifications]);

  // Main messages effect
  useEffect(() => {
    if (!roomId || typeof roomId !== 'string') {
      console.error('Invalid roomId provided:', roomId);
      Alert.alert('Error', 'Cannot load chat. Invalid room ID.');
      setLoading(false);
      return;
    }

    let messagesListener: (() => void) | null = null;

    const setupMessagesListener = async () => {
      try {
        // Security: Check if user has access to this room
        const user = getCurrentUser();
        const hasAccess = await canUserAccessRoom(roomId, user.uid);
        
        if (!hasAccess) {
          Alert.alert('Access Denied', 'You do not have permission to view this chat.');
          setLoading(false);
          return;
        }

        // Fetch room details using service
        const room = await ChatService.getRoom(roomId);
        if (room) {
          setRoomName(room.name || 'Unknown Room');
        }

        // Log security event
        await logSecurityEvent('chat_room_accessed', { roomId });

        // Get initial messages using service
        const result = await ChatService.getInitialMessages(roomId, 50);
        
        setMessages(result.messages);
        setLastVisible(result.lastVisible);
        setHasMore(result.hasMore);
        setLoading(false);

        // Set up real-time listener for new messages
        if (result.messages.length > 0 && result.messages[result.messages.length - 1].createdAt) {
          const lastMessageTimestamp = result.messages[result.messages.length - 1].createdAt;
          
          messagesListener = ChatService.createNewMessagesListener(
            roomId,
            lastMessageTimestamp,
            (newMessages) => {
              setMessages(prev => {
                const existingIds = new Set(prev.map(msg => msg.id));
                const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
                
                // Show notifications for new messages
                uniqueNewMessages.forEach(message => {
                  showMessageNotification(message, roomName);
                });
                
                return [...prev, ...uniqueNewMessages];
              });
            },
            (error) => {
              console.error('Error listening for new messages:', error);
              handleSecureError(error, 'Error loading new messages.');
            }
          );
        }
      } catch (error) {
        console.error(`Error fetching messages for room ${roomId}: `, error);
        if ((error as any).code === 'permission-denied') {
          Alert.alert("Permission Error", "You don't have permission to view these messages.");
        } else {
          handleSecureError(error, "Could not load messages.");
        }
        setLoading(false);
      }
    };

    setupMessagesListener();

    return () => {
      if (messagesListener) {
        messagesListener();
      }
    };
  }, [roomId]);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    loadMoreMessages,
    flatListRef,
    roomName,
  };
};

// Re-export Message type for backward compatibility
export type { Message };
