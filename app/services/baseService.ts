import auth from '@react-native-firebase/auth';

export class BaseService {
  protected static getCurrentUserId(): string {
    const user = auth().currentUser;
    if (!user) {
      throw new Error('No authenticated user found');
    }
    return user.uid;
  }

  protected static handleFirebaseError(error: any, context: string) {
    console.error(`${context}:`, error);
    
    // Common Firebase error codes
    switch (error.code) {
      case 'permission-denied':
        throw new Error('You do not have permission to perform this action');
      case 'not-found':
        throw new Error('The requested resource was not found');
      case 'unauthenticated':
        throw new Error('You must be logged in to perform this action');
      default:
        throw new Error(`Operation failed: ${error.message}`);
    }
  }
}
