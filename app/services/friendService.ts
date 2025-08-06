import firestore from '@react-native-firebase/firestore';
import { BaseService } from './baseService';
import { UserService, User } from './userService';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: any;
  fromUserName?: string;
  fromUserEmail?: string;
}

export class FriendService extends BaseService {
  // Send friend request
  static async sendFriendRequest(toUserId: string): Promise<void> {
    try {
      const fromUserId = this.getCurrentUserId();
      
      if (fromUserId === toUserId) {
        throw new Error('Cannot send friend request to yourself');
      }

      // Check if request already exists
      const existingRequest = await firestore()
        .collection('friendRequests')
        .where('fromUserId', '==', fromUserId)
        .where('toUserId', '==', toUserId)
        .where('status', '==', 'pending')
        .get();

      if (!existingRequest.empty) {
        throw new Error('Friend request already sent');
      }

      // Check if they're already friends
      const userDoc = await firestore().collection('users').doc(fromUserId).get();
      const userData = userDoc.data();
      if (userData?.friends?.includes(toUserId)) {
        throw new Error('Already friends with this user');
      }

      // Get sender info
      const senderData = await UserService.getUserById(fromUserId);
      
      // Create friend request
      await firestore().collection('friendRequests').add({
        fromUserId,
        toUserId,
        status: 'pending',
        requestedAt: firestore.FieldValue.serverTimestamp(),
        fromUserName: senderData?.displayName || senderData?.userName || 'Unknown User',
        fromUserEmail: senderData?.email || ''
      });
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to send friend request');
    }
  }

  // Accept friend request
  static async acceptFriendRequest(requestId: string): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      
      // Get the request
      const requestDoc = await firestore().collection('friendRequests').doc(requestId).get();
      if (!requestDoc.exists) {
        throw new Error('Friend request not found');
      }

      const requestData = requestDoc.data() as FriendRequest;
      if (requestData.toUserId !== userId) {
        throw new Error('Not authorized to accept this request');
      }

      const batch = firestore().batch();

      // Update request status
      batch.update(firestore().collection('friendRequests').doc(requestId), {
        status: 'accepted'
      });

      // Add to both users' friends lists
      const userRef = firestore().collection('users').doc(userId);
      const friendRef = firestore().collection('users').doc(requestData.fromUserId);

      batch.update(userRef, {
        friends: firestore.FieldValue.arrayUnion(requestData.fromUserId)
      });

      batch.update(friendRef, {
        friends: firestore.FieldValue.arrayUnion(userId)
      });

      await batch.commit();
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to accept friend request');
    }
  }

  // Reject friend request
  static async rejectFriendRequest(requestId: string): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      
      const requestDoc = await firestore().collection('friendRequests').doc(requestId).get();
      if (!requestDoc.exists) {
        throw new Error('Friend request not found');
      }

      const requestData = requestDoc.data() as FriendRequest;
      if (requestData.toUserId !== userId) {
        throw new Error('Not authorized to reject this request');
      }

      await firestore().collection('friendRequests').doc(requestId).update({
        status: 'rejected'
      });
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to reject friend request');
    }
  }

  // Get pending friend requests for current user
  static async getPendingFriendRequests(): Promise<FriendRequest[]> {
    try {
      const userId = this.getCurrentUserId();
      
      const snapshot = await firestore()
        .collection('friendRequests')
        .where('toUserId', '==', userId)
        .where('status', '==', 'pending')
        .orderBy('requestedAt', 'desc')
        .get();

      const requests: FriendRequest[] = [];
      snapshot.forEach(doc => {
        requests.push({
          id: doc.id,
          ...doc.data()
        } as FriendRequest);
      });

      return requests;
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to get friend requests');
      return [];
    }
  }

  // Remove friend
  static async removeFriend(friendId: string): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      
      const batch = firestore().batch();

      // Remove from both users' friends lists
      const userRef = firestore().collection('users').doc(userId);
      const friendRef = firestore().collection('users').doc(friendId);

      batch.update(userRef, {
        friends: firestore.FieldValue.arrayRemove(friendId)
      });

      batch.update(friendRef, {
        friends: firestore.FieldValue.arrayRemove(userId)
      });

      await batch.commit();
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to remove friend');
    }
  }

  // Get user's friends
  static async getFriends(userId?: string): Promise<User[]> {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      
      const userDoc = await firestore().collection('users').doc(targetUserId).get();
      if (!userDoc.exists) return [];

      const userData = userDoc.data();
      const friendIds = userData?.friends || [];

      if (friendIds.length === 0) return [];

      return await UserService.getUsersByIds(friendIds);
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to get friends');
      return [];
    }
  }

  // Create listener for friend requests
  static createFriendRequestsListener(
    onRequestsUpdate: (requests: FriendRequest[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const userId = this.getCurrentUserId();
    
    return firestore()
      .collection('friendRequests')
      .where('toUserId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('requestedAt', 'desc')
      .onSnapshot(
        snapshot => {
          const requests: FriendRequest[] = [];
          snapshot.forEach(doc => {
            requests.push({
              id: doc.id,
              ...doc.data()
            } as FriendRequest);
          });
          onRequestsUpdate(requests);
        },
        error => onError(new Error(error.message))
      );
  }
}
