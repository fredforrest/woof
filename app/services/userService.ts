import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
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
    } catch (error: any) {
      this.logFirebaseError(error, 'Error updating online status');
      
      // If document doesn't exist, try to create it
      if (error.code === 'not-found') {
        console.log('🔍 User document not found, creating basic user document...');
        try {
          await firestore().collection('users').doc(userId).set({
            isOnline,
            lastSeen: firestore.FieldValue.serverTimestamp(),
            createdAt: firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log('✅ Basic user document created for online status');
        } catch (createError) {
          this.logFirebaseError(createError, 'Failed to create user for online status');
        }
      }
    }
  }

  // Create or update user document
  static async createOrUpdateUser(userId: string, userData: Partial<User>): Promise<void> {
    try {
      console.log('🔄 Starting createOrUpdateUser for:', userId);
      
      // Always use merge: true to avoid overwriting existing data
      const userDocData = {
        ...userData,
        friends: [],
        sentFriendRequests: [],
        isOnline: true,
        lastSeen: firestore.FieldValue.serverTimestamp(),
      };

      // First, try to get existing document
      const userDoc = await firestore().collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        // Create new user with all required fields
        console.log('📝 Creating new user document for:', userId);
        await firestore().collection('users').doc(userId).set({
          ...userDocData,
          createdAt: firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ New user document created successfully');
      } else {
        // Update existing user, preserve existing friends and sentFriendRequests
        console.log('📝 Updating existing user document for:', userId);
        const existingData = userDoc.data();
        await firestore().collection('users').doc(userId).set({
          ...userDocData,
          friends: existingData?.friends || [],
          sentFriendRequests: existingData?.sentFriendRequests || [],
          createdAt: existingData?.createdAt || firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('✅ Existing user document updated successfully');
      }
      
      // Verify document was created/updated
      const verifyDoc = await firestore().collection('users').doc(userId).get();
      if (!verifyDoc.exists) {
        throw new Error('User document still does not exist after creation attempt');
      }
      
      console.log('✅ User document verified to exist for:', userId);
      
    } catch (error: any) {
      console.error('❌ Error in createOrUpdateUser:', error);
      // Use non-throwing error logging for user creation/update
      this.logFirebaseError(error, 'Failed to create or update user');
      
      // For user creation, we'll try a simpler approach if the full creation fails
      if (error.code === 'permission-denied') {
        console.log('⚠️ Permission denied, attempting simple user creation...');
        try {
          await firestore().collection('users').doc(userId).set({
            displayName: userData.displayName || 'User',
            email: userData.email || '',
            isOnline: true,
            friends: [],
            sentFriendRequests: [],
            createdAt: firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log('✅ Simple user document created with merge');
        } catch (retryError) {
          this.logFirebaseError(retryError, 'Failed to create user document (retry)');
        }
      }
    }
  }

  // Ensure user document exists (creates if missing)
  static async ensureUserDocumentExists(userId: string): Promise<boolean> {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.log('🔧 User document missing, creating basic document for:', userId);
        const currentUser = auth().currentUser;
        
        await firestore().collection('users').doc(userId).set({
          displayName: currentUser?.displayName || 'User',
          email: currentUser?.email || '',
          photoURL: currentUser?.photoURL || '',
          friends: [],
          sentFriendRequests: [],
          isOnline: true,
          lastSeen: firestore.FieldValue.serverTimestamp(),
          createdAt: firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Basic user document created');
        return true;
      }
      
      console.log('✅ User document already exists for:', userId);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to ensure user document exists:', error);
      this.logFirebaseError(error, 'Failed to ensure user document exists');
      return false;
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
