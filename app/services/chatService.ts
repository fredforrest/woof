import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { BaseService } from './baseService';

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

export interface Room {
  id: string;
  name: string;
  description?: string;
  lastMessageTimestamp?: any;
  lastMessageText?: string;
  participants?: string[];
  createdBy?: string;
  isPrivate?: boolean;
  joinRequests?: any[];
}

export class ChatService extends BaseService {
  // Get room details
  static async getRoom(roomId: string): Promise<Room | null> {
    try {
      const doc = await firestore().collection('chatRooms').doc(roomId).get();
      if (!doc.exists) return null;
      
      return {
        id: doc.id,
        ...doc.data()
      } as Room;
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to get room');
      return null;
    }
  }

  // Get initial messages with pagination
  static async getInitialMessages(roomId: string, limit: number = 50): Promise<{
    messages: Message[];
    lastVisible: FirebaseFirestoreTypes.DocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      const snapshot = await firestore()
        .collection('chatRooms')
        .doc(roomId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const messages: Message[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data?.createdAt) {
          messages.push({
            id: doc.id,
            ...data,
          } as Message);
        }
      });

      return {
        messages: messages.reverse(),
        lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.size === limit
      };
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to load messages');
      return { messages: [], lastVisible: null, hasMore: false };
    }
  }

  // Load more messages for pagination
  static async loadMoreMessages(
    roomId: string, 
    lastVisible: FirebaseFirestoreTypes.DocumentSnapshot,
    limit: number = 50
  ): Promise<{
    messages: Message[];
    lastVisible: FirebaseFirestoreTypes.DocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      const snapshot = await firestore()
        .collection('chatRooms')
        .doc(roomId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .startAfter(lastVisible)
        .limit(limit)
        .get();

      const messages: Message[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data?.createdAt) {
          messages.push({
            id: doc.id,
            ...data,
          } as Message);
        }
      });

      return {
        messages: messages.reverse(),
        lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.size === limit
      };
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to load more messages');
      return { messages: [], lastVisible: null, hasMore: false };
    }
  }

  // Create real-time listener for new messages
  static createNewMessagesListener(
    roomId: string,
    afterTimestamp: FirebaseFirestoreTypes.Timestamp,
    onNewMessages: (messages: Message[]) => void,
    onError: (error: Error) => void
  ): () => void {
    return firestore()
      .collection('chatRooms')
      .doc(roomId)
      .collection('messages')
      .where('createdAt', '>', afterTimestamp)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          const newMessages: Message[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data?.createdAt) {
              newMessages.push({
                id: doc.id,
                ...data,
              } as Message);
            }
          });
          
          if (newMessages.length > 0) {
            onNewMessages(newMessages.reverse());
          }
        },
        error => onError(new Error(error.message))
      );
  }

  // Send a message
  static async sendMessage(roomId: string, messageData: {
    text?: string;
    photoURL?: string;
    senderName: string;
    senderAvatarUrl?: string;
  }): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      
      await firestore()
        .collection('chatRooms')
        .doc(roomId)
        .collection('messages')
        .add({
          ...messageData,
          userId,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to send message');
    }
  }

  // Delete a room
  static async deleteRoom(roomId: string): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      
      // Check if user owns the room
      const roomDoc = await firestore().collection('chatRooms').doc(roomId).get();
      if (!roomDoc.exists) {
        throw new Error('Room not found');
      }
      
      const roomData = roomDoc.data();
      if (roomData?.createdBy !== userId) {
        throw new Error('Only the room creator can delete this room');
      }

      // Delete all messages first
      const messagesSnapshot = await firestore()
        .collection('chatRooms')
        .doc(roomId)
        .collection('messages')
        .get();

      const batch = firestore().batch();
      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete the room
      batch.delete(firestore().collection('chatRooms').doc(roomId));
      
      await batch.commit();
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to delete room');
    }
  }
}
