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
  'Login Menu': undefined;
  Home: undefined; // This screen does not need quotes around the name, when it is a single word

  // Add any other screens in this specific Stack Navigator here
  // Example: Profile: { userId: string };
};

/**
 * Optional: Defines a reusable type for the navigation prop specific to the RootStack.
 *
 * This makes it slightly cleaner to type the 'useNavigation' hook in your screens.
 * Instead of writing: useNavigation<NativeStackNavigationProp<RootStackParamList>>()
 * You can write: useNavigation<RootStackNavigationProp>()
 *
 * The <RouteName extends keyof RootStackParamList = 'Home'> part makes it generic
 * and provides a default screen context, though React Navigation often infers
 * the correct screen context automatically when the stack is typed.
 */
export type RootStackNavigationProp<
  RouteName extends keyof RootStackParamList = keyof RootStackParamList,
> = NativeStackNavigationProp<RootStackParamList, RouteName>;

// If you had other navigators (e.g., a Tab navigator nested inside a screen),
// you would define separate ParamList types for them as well.