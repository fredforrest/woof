import React, { useEffect, useState, useRef } from 'react';
import { Platform, SafeAreaView } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import auth from '@react-native-firebase/auth';
import LoginMenu from './app/screens/loginmenu';
import HomeScreen from './app/screens/homescreen';
import ChatRooms from './app/screens/chatrooms';
import Profile from './app/screens/profile';
import ProfileSettings from './app/screens/profilesettings';
import { RootStackParamList } from './app/components/navigation/types';
import CreateChat from './app/screens/createchat';
import ChatScreen from './app/screens/chatscreen';
import PendingRequestsScreen from './app/screens/pendingrequests';
import SplashScreen from 'react-native-splash-screen';
import { StatusBar } from 'react-native';
import NavigationSecurity from './app/utils/navigationSecurity';
import { notificationManager } from './app/utils/notificationManager';
import { notificationNavigationHandler } from './app/utils/notificationNavigationHandler';
import { ActiveRoomProvider } from './app/contexts/activeRoomContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: "917951632143-k3j5bkl1k86n8sibqpcgf54v8p4bupag.apps.googleusercontent.com",
  iosClientId: "917951632143-4gfgsa42pnjt9bcepsbtetqmdc2ajkgm.apps.googleusercontent.com",
});

const App = () => {
    const [initializing, setInitializing] = useState(true);
    const [user, setUser] = useState(null);
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