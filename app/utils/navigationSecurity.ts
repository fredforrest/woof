import { NavigationContainerRef } from '@react-navigation/native';
import { Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { 
  getCurrentUser, 
  validateRoomId, 
  canUserAccessRoom, 
  logSecurityEvent,
  logSecurityWarning 
} from './security';

/**
 * Security middleware for navigation
 */
export class NavigationSecurity {
  private static navigationRef: NavigationContainerRef<any> | null = null;

  static setNavigationRef(ref: NavigationContainerRef<any>) {
    this.navigationRef = ref;
  }

  /**
   * Secure navigation to chat screen with permission checking
   */
  static async navigateToChat(roomId: string): Promise<boolean> {
    try {
      // Validate room ID format
      if (!validateRoomId(roomId)) {
        Alert.alert('Error', 'Invalid room ID');
        logSecurityWarning('Invalid room ID navigation attempt', { roomId });
        return false;
      }

      // Check authentication
      const user = getCurrentUser();
      
      // Check room access permissions
      const hasAccess = await canUserAccessRoom(roomId, user.uid);
      if (!hasAccess) {
        Alert.alert('Access Denied', 'You do not have permission to access this chat room.');
        logSecurityEvent('unauthorized_room_access_attempt', { roomId, userId: user.uid });
        return false;
      }

      // Navigate if all checks pass
      if (this.navigationRef) {
        this.navigationRef.navigate('ChatScreen', { roomId });
        logSecurityEvent('secure_navigation', { destination: 'ChatScreen', roomId });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Navigation security error:', error);
      Alert.alert('Error', 'Unable to access chat room');
      return false;
    }
  }

  /**
   * Secure navigation with authentication check
   */
  static navigateWithAuth(screenName: string, params?: any): boolean {
    try {
      const user = getCurrentUser();
      
      if (this.navigationRef) {
        this.navigationRef.navigate(screenName, params);
        logSecurityEvent('authenticated_navigation', { destination: screenName });
        return true;
      }

      return false;
    } catch (error) {
      Alert.alert('Authentication Required', 'Please log in to continue');
      this.navigateToLogin();
      return false;
    }
  }

  /**
   * Navigate to login screen
   */
  static navigateToLogin(): void {
    if (this.navigationRef) {
      this.navigationRef.reset({
        index: 0,
        routes: [{ name: 'LoginMenu' }],
      });
    }
  }

  /**
   * Check if current screen requires authentication
   */
  static requiresAuth(routeName: string): boolean {
    const publicRoutes = ['LoginMenu'];
    return !publicRoutes.includes(routeName);
  }

  /**
   * Global navigation listener for security checks
   */
  static onNavigationStateChange = (state: any) => {
    if (!state) return;

    const currentRoute = state.routes[state.index];
    
    // Check if route requires authentication
    if (this.requiresAuth(currentRoute.name)) {
      const user = auth().currentUser;
      if (!user) {
        logSecurityWarning('Unauthenticated access attempt', { route: currentRoute.name });
        this.navigateToLogin();
        return;
      }
    }

    // Log navigation for security monitoring
    logSecurityEvent('navigation_state_change', { 
      route: currentRoute.name,
      params: currentRoute.params 
    });
  };
}

export default NavigationSecurity;
