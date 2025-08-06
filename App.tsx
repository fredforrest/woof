import React, { useEffect, useState, useRef } from 'react';
import { Platform, SafeAreaView, AppState } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { UserService } from './app/services';
import LoginMenu from './app/screens/LoginMenu';
import HomeScreen from './app/screens/HomeScreen';
import ChatRooms from './app/screens/ChatRooms';
import Profile from './app/screens/Profile';
import ProfileSettings from './app/screens/ProfileSettings';
import { RootStackParamList } from './app/components/navigation/types';
import CreateChat from './app/screens/CreateChat';
import ChatScreen from './app/screens/ChatScreen';
import PendingRequestsScreen from './app/screens/PendingRequests';
import FriendsScreen from './app/screens/Friends';
import SplashScreen from 'react-native-splash-screen';
import { StatusBar } from 'react-native';
import NavigationSecurity from './app/utils/navigationSecurity';
import { notificationManager } from './app/utils/notificationManager';
import { notificationNavigationHandler } from './app/utils/notificationNavigationHandler';
import { ActiveRoomProvider } from './app/contexts/ActiveRoomContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: "917951632143-k3j5bkl1k86n8sibqpcgf54v8p4bupag.apps.googleusercontent.com",
  iosClientId: "917951632143-4gfgsa42pnjt9bcepsbtetqmdc2ajkgm.apps.googleusercontent.com",
});

const App = () => {
    const [initializing, setInitializing] = useState(true);
    const [user, setUser] = useState<any>(null);
    const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

    // Set navigation reference for security middleware and notifications
    useEffect(() => {
        if (navigationRef.current) {
            NavigationSecurity.setNavigationRef(navigationRef.current);
            notificationNavigationHandler.setNavigationRef(navigationRef.current);
        }
    }, []);

    // Initialize notifications
    useEffect(() => {
        const initNotifications = async () => {
            try {
                await notificationManager.initialize();
                console.log('Notifications initialized in App.tsx');
            } catch (error) {
                console.error('Failed to initialize notifications:', error);
            }
        };

        initNotifications();
    }, []);
  
    // Handle user state changes
    function onAuthStateChanged(user: any) {
        setUser(user);
        if (initializing) setInitializing(false);
    }

    // Keep user's online status updated while app is active
    useEffect(() => {
        if (!user) return;

        const updateOnlineStatus = async () => {
            try {
                // Ensure user document exists before updating online status
                const userExists = await UserService.ensureUserDocumentExists(user.uid);
                if (userExists) {
                    // Use UserService to ensure user document exists before updating
                    await UserService.createOrUpdateUser(user.uid, {
                        displayName: user.displayName || 'User',
                        email: user.email || '',
                        photoURL: user.photoURL || '',
                        isOnline: true
                    });
                } else {
                    console.error('Failed to ensure user document exists');
                }
            } catch (error) {
                console.error('Error updating online status:', error);
            }
        };

        // Update immediately when user logs in
        updateOnlineStatus();

        // Update every 2 minutes while app is active
        const onlineInterval = setInterval(updateOnlineStatus, 2 * 60 * 1000);

        return () => {
            clearInterval(onlineInterval);
        };
    }, [user]);

    // Handle app state changes (background/foreground)
    useEffect(() => {
        if (!user) return;

        const handleAppStateChange = async (nextAppState: string) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                // User goes offline when app is backgrounded
                try {
                    await UserService.updateOnlineStatus(user.uid, false);
                    console.log('User set to offline');
                } catch (error) {
                    console.error('Error setting user offline:', error);
                }
            } else if (nextAppState === 'active') {
                // User comes back online when app becomes active
                try {
                    await UserService.createOrUpdateUser(user.uid, {
                        displayName: user.displayName || 'User',
                        email: user.email || '',
                        photoURL: user.photoURL || '',
                        isOnline: true
                    });
                    console.log('User set to online');
                } catch (error) {
                    console.error('Error setting user online:', error);
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [user]);

    // Subscribe to authentication state changes
    useEffect(() => {

        if (Platform.OS === 'android') {
            SplashScreen.hide(); // Hide the splash screen after the app is loaded
            }
            
        const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
        return subscriber; // Unsubscribe on unmount

        
    },  []);

    if (initializing) return null; // Optionally, show a loading indicator here
    
 
    return (
        <>
            {/* Set the status bar color */}
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                    <ActiveRoomProvider>
                        <NavigationContainer 
                            ref={navigationRef}
                            onStateChange={NavigationSecurity.onNavigationStateChange}
                        >
                        <Stack.Navigator
                            screenOptions={{
                                headerStyle: { backgroundColor: '#FFFFFF' }, // White header background
                                headerTintColor: '#000000', // Black text for header
                                headerBackVisible: true,
                            }}
                        >
                            {user ? (
                                <>
                                    <Stack.Screen
                                        name="Home"
                                        component={HomeScreen}
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="ChatRooms"
                                        component={ChatRooms}
                                        options={{ headerShown: true, title: "Chat Rooms" }}
                                    />
                                    <Stack.Screen
                                        name="Profile"
                                        component={Profile}
                                        options={{ headerShown: true }}
                                    />
                                    <Stack.Screen
                                        name="Profile Settings"
                                        component={ProfileSettings}
                                        options={{ headerShown: true }}
                                    />
                                    <Stack.Screen
                                        name="Friends"
                                        component={FriendsScreen}
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="Create Room"
                                        component={CreateChat}
                                        options={{ headerShown: true }}
                                    />
                                    <Stack.Screen
                                        name="PendingRequests"
                                        component={PendingRequestsScreen}
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="ChatScreen"
                                        component={ChatScreen}
                                        options={{ headerShown: true, title: "Chat" }}
                                        
                                    />
                                </>
                            ) : (
                                <Stack.Screen
                                    name="LoginMenu"
                                    component={LoginMenu}
                                    options={{ headerShown: false }}
                                />
                            )}
                        </Stack.Navigator>
                    </NavigationContainer>
                    </ActiveRoomProvider>
                </SafeAreaView>
            </GestureHandlerRootView>
        </>
    );
};

export default App;