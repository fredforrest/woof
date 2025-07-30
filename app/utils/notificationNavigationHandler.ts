import { NavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../components/navigation/types';

class NotificationNavigationHandler {
  private navigationRef: NavigationContainerRef<RootStackParamList> | null = null;

  setNavigationRef(ref: NavigationContainerRef<RootStackParamList>) {
    this.navigationRef = ref;
  }

  handleNotificationNavigation(roomId: string, roomName: string) {
    if (!this.navigationRef) {
      console.warn('Navigation ref not set');
      return;
    }

    try {
      // Navigate to the specific chat room
      this.navigationRef.navigate('ChatScreen', {
        roomId: roomId,
        roomName: roomName,
      });
    } catch (error) {
      console.error('Error navigating from notification:', error);
    }
  }

  navigateToRooms() {
    if (!this.navigationRef) return;
    
    try {
      this.navigationRef.navigate('ChatRooms');
    } catch (error) {
      console.error('Error navigating to rooms:', error);
    }
  }
}

export const notificationNavigationHandler = new NotificationNavigationHandler();
