import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { 
  validateMessage, 
  sanitizeInput, 
  messageRateLimit, 
  getCurrentUser, 
  canUserAccessRoom, 
  logSecurityEvent, 
  handleSecureError 
} from '../utils/security';

interface UseMessageSendingReturn {
  newMessage: string;
  isSending: boolean;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => Promise<void>;
  handleSendPhoto: (uri: string) => Promise<void>;
}

export const useMessageSending = (roomId: string): UseMessageSendingReturn => {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = useCallback(async () => {
    try {
      const user = getCurrentUser();
      
      // Security: Validate message
      if (!validateMessage(newMessage)) {
        Alert.alert('Invalid Message', 'Message must be between 1 and 1000 characters.');
        return;
      }

      // Security: Check rate limit
      if (!messageRateLimit.canSendMessage(user.uid)) {
        Alert.alert('Rate Limit', 'Please wait before sending another message.');
        return;
      }

      // Security: Check room access
      const hasAccess = await canUserAccessRoom(roomId, user.uid);
      if (!hasAccess) {
        Alert.alert('Access Denied', 'You do not have permission to send messages here.');
        return;
      }

      if (isSending) return;

      setIsSending(true);
      const messageText = sanitizeInput(newMessage).trim();
      
      // Don't send empty messages
      if (!messageText) {
        setIsSending(false);
        return;
      }
      
      setNewMessage('');

      const senderName = user.displayName || 'Unknown User';
      const senderAvatarUrl = user.photoURL || null;

      const messageTimestamp = firestore.FieldValue.serverTimestamp();
      const messageData = {
        text: messageText,
        createdAt: messageTimestamp,
        userId: user.uid,
        senderName: senderName,
        senderAvatarUrl: senderAvatarUrl,
      };

      const roomRef = firestore().collection('chatRooms').doc(roomId);
      const messagesRef = roomRef.collection('messages');

      const batch = firestore().batch();

      batch.set(messagesRef.doc(), messageData);
      batch.update(roomRef, {
        lastMessageTimestamp: messageTimestamp,
        lastMessageText: messageText,
      });

      await batch.commit();
      
      // Log security event
      await logSecurityEvent('message_sent', { roomId, messageLength: messageText.length });
      
    } catch (error) {
      console.error(`Error sending message to room ${roomId}: `, error);
      setNewMessage(newMessage); // Restore message on error
      
      if ((error as { code?: string }).code === 'permission-denied') {
        Alert.alert("Permission Error", "You don't have permission to send messages here.");
      } else {
        handleSecureError(error, "Could not send message.");
      }
    } finally {
      setIsSending(false);
    }
  }, [newMessage, roomId, isSending]);

  const handleSendPhoto = useCallback(
    async (uri: string) => {
      try {
        const user = getCurrentUser();
        
        // Security: Check rate limit
        if (!messageRateLimit.canSendMessage(user.uid)) {
          Alert.alert('Rate Limit', 'Please wait before sending another message.');
          return;
        }

        // Security: Check room access
        const hasAccess = await canUserAccessRoom(roomId, user.uid);
        if (!hasAccess) {
          Alert.alert('Access Denied', 'You do not have permission to send photos here.');
          return;
        }

        if (isSending) return;

        setIsSending(true);

        const fileName = `${user.uid}_${Date.now()}`;
        const ref = storage().ref(`chatRooms/${roomId}/${fileName}`);
        await ref.putFile(uri);
        const downloadURL = await ref.getDownloadURL();

        const senderName = user.displayName || 'Unknown User';
        const senderAvatarUrl = user.photoURL || null;
        const messageTimestamp = firestore.FieldValue.serverTimestamp();

        const messageData = {
          photoURL: downloadURL,
          createdAt: messageTimestamp,
          userId: user.uid,
          senderName: senderName,
          senderAvatarUrl: senderAvatarUrl,
        };

        const roomRef = firestore().collection('chatRooms').doc(roomId);
        const messagesRef = roomRef.collection('messages');
        const batch = firestore().batch();

        batch.set(messagesRef.doc(), messageData);
        batch.update(roomRef, {
          lastMessageTimestamp: messageTimestamp,
          lastMessageText: '[Photo]',
        });

        await batch.commit();
        
        // Log security event
        await logSecurityEvent('photo_sent', { roomId });
        
      } catch (error) {
        handleSecureError(error, 'Failed to send photo.');
      } finally {
        setIsSending(false);
      }
    },
    [roomId, isSending]
  );

  return {
    newMessage,
    isSending,
    setNewMessage,
    handleSendMessage,
    handleSendPhoto,
  };
};
