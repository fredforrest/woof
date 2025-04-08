import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * Defines the parameter list for the root stack navigator.
 *
 * Each key corresponds to a screen name defined in your Stack.Navigator.
 * The value is the type of parameters expected by that screen.
 * Use 'undefined' if the screen does not expect any parameters.
 *
 * Example: If 'UserProfile' screen expected a 'userId' string parameter:
 * UserProfile: { userId: string };
 */
export type RootStackParamList = {
  // Use the exact string names from your <Stack.Screen name="..." /> components
  LoginMenu: undefined;
  Home: undefined; // This screen does not need quotes around the name, when it is a single word
  ChatRooms: undefined;
    Profile: undefined; 
    'Profile Settings': undefined;
    'Create Room': undefined;
    ChatScreen: { roomId: string; 
      roomName: string;
}; // Example of a screen that expects parameters

};

export type RootStackNavigationProp<
  RouteName extends keyof RootStackParamList = keyof RootStackParamList,
> = NativeStackNavigationProp<RootStackParamList, RouteName>;
