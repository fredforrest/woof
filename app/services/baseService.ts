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

  // Log errors without throwing (for non-critical operations)
  protected static logFirebaseError(error: any, context: string): void {
    console.error(`${context}:`, error.code || 'unknown-error', error.message);
    
    // Log specific error details for debugging
    if (error.code) {
      console.error(`Firebase Error Code: ${error.code}`);
    }
  }
}
