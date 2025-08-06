import firestore from '@react-native-firebase/firestore';
import { BaseService } from './baseService';

export interface User {
  id: string;
  userName?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  dogType?: string;
  isOnline?: boolean;
  lastSeen?: any;
  friends?: string[];
  sentFriendRequests?: string[];
}

export class UserService extends BaseService {
  // Get user by ID
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const doc = await firestore().collection('users').doc(userId).get();
      if (!doc.exists) return null;
      
      return {
        id: doc.id,
        ...doc.data()
      } as User;
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to get user');
      return null;
    }
  }

  // Get multiple users by IDs
  static async getUsersByIds(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) return [];
    
    try {
      const users: User[] = [];
      
      // Firestore 'in' queries are limited to 10 items
      for (let i = 0; i < userIds.length; i += 10) {
        const batch = userIds.slice(i, i + 10);
        const snapshot = await firestore()
          .collection('users')
          .where(firestore.FieldPath.documentId(), 'in', batch)
          .get();

        snapshot.docs.forEach(doc => {
          users.push({
            id: doc.id,
            ...doc.data()
          } as User);
        });
      }
      
      return users;
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to get users');
      return [];
    }
  }

  // Search users by username or email
  static async searchUsers(query: string): Promise<User[]> {
    try {
      const cleanQuery = query.trim().toLowerCase();
      if (!cleanQuery) return [];

      // Get all users and filter manually (Firestore has limited text search)
      const snapshot = await firestore().collection('users').get();
      const users: User[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const userName = (data.userName || '').toLowerCase();
        const displayName = (data.displayName || '').toLowerCase();
        const email = (data.email || '').toLowerCase();

        if (
          userName.includes(cleanQuery) ||
          displayName.includes(cleanQuery) ||
          email.includes(cleanQuery)
        ) {
          users.push({
            id: doc.id,
            ...data
          } as User);
        }
      });

      return users;
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to search users');
      return [];
    }
  }

  // Update user profile
  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      await firestore().collection('users').doc(userId).update(updates);
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to update user');
    }
  }

  // Update online status
  static async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await firestore().collection('users').doc(userId).update({
        isOnline,
        lastSeen: firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to update online status');
    }
  }

  // Create or update user document
  static async createOrUpdateUser(userId: string, userData: Partial<User>): Promise<void> {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        // Create new user
        await firestore().collection('users').doc(userId).set({
          ...userData,
          friends: [],
          sentFriendRequests: [],
          isOnline: true,
          lastSeen: firestore.FieldValue.serverTimestamp(),
          createdAt: firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Update existing user
        await firestore().collection('users').doc(userId).update({
          ...userData,
          isOnline: true,
          lastSeen: firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      this.handleFirebaseError(error, 'Failed to create or update user');
    }
  }

  // Format user data consistently
  static formatUserData(userData: any): User {
    return {
      id: userData.id,
      displayName: userData.displayName || userData.userName || 'Unknown User',
      userName: userData.userName,
      email: userData.email || '',
      photoURL: userData.photoURL,
      dogType: userData.dogType,
      isOnline: userData.isOnline || false,
      lastSeen: userData.lastSeen,
      friends: userData.friends || [],
      sentFriendRequests: userData.sentFriendRequests || []
    };
  }
}
