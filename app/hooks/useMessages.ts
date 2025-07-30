import { useState, useEffect, useRef } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Alert } from 'react-native';
import { getCurrentUser, canUserAccessRoom, logSecurityEvent, handleSecureError } from '../utils/security';

export interface Message {
  id: string;
  text: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  userId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  isTyping?: boolean;
  photoURL?: string;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMoreMessages: () => Promise<void>;
  flatListRef: React.RefObject<any>;
}

export const useMessages = (roomId: string): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<FirebaseFirestoreTypes.DocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const flatListRef = useRef<any>(null);

  // Load more messages function
  const loadMoreMessages = async () => {
    if (!roomId || !lastVisible || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    try {
      const snapshot = await firestore()
        .collection('chatRooms')
        .doc(roomId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .startAfter(lastVisible)
        .limit(50)
        .get();

      const fetchedMessages: Message[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data?.createdAt) {
          fetchedMessages.push({
            id: doc.id,
            ...data,
          } as Message);
        }
      });

      if (fetchedMessages.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg.id));
          const uniqueNewMessages = fetchedMessages.filter(msg => !existingIds.has(msg.id));
          return [...uniqueNewMessages.reverse(), ...prev];
        });
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      setHasMore(snapshot.size === 50);
    } catch (error) {
      console.error('Error loading more messages:', error);
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

        // Log security event
        await logSecurityEvent('chat_room_accessed', { roomId });

        // Initial fetch of last 50 messages
        const initialSnapshot = await firestore()
          .collection('chatRooms')
          .doc(roomId)
          .collection('messages')
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();

        const fetchedMessages: Message[] = [];
        initialSnapshot.forEach(doc => {
          const data = doc.data();
          if (data?.createdAt) {
            fetchedMessages.push({
              id: doc.id,
              ...data,
            } as Message);
          }
        });

        setMessages(fetchedMessages.reverse());
        setLastVisible(initialSnapshot.docs[initialSnapshot.docs.length - 1]);
        setHasMore(initialSnapshot.size === 50);
        setLoading(false);

        // Set up real-time listener for new messages only
        if (initialSnapshot.docs.length > 0) {
          messagesListener = firestore()
            .collection('chatRooms')
            .doc(roomId)
            .collection('messages')
            .where('createdAt', '>', initialSnapshot.docs[0].data().createdAt)
            .orderBy('createdAt', 'desc')
            .onSnapshot(
              newSnapshot => {
                const newMessages: Message[] = [];
                newSnapshot.forEach(doc => {
                  const data = doc.data();
                  if (data?.createdAt) {
                    newMessages.push({
                      id: doc.id,
                      ...data,
                    } as Message);
                  }
                });
                
                if (newMessages.length > 0) {
                  setMessages(prev => {
                    const existingIds = new Set(prev.map(msg => msg.id));
                    const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
                    return [...prev, ...uniqueNewMessages.reverse()];
                  });
                }
              },
              error => {
                console.error(`Error listening for new messages: `, error);
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
  };
};
