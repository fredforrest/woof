import React, { useEffect, useState } from 'react';
import { Platform, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import LoginMenu from './app/screens/loginmenu';
import HomeScreen from './app/screens/homescreen';
import ChatRooms from './app/screens/chatrooms';
import Profile from './app/screens/profile';
import ProfileSettings from './app/screens/profilesettings';
import { RootStackParamList } from './app/components/navigation/types';
import CreateChat from './app/screens/createchat';
import ChatScreen from './app/screens/chatscreen';
import SplashScreen from 'react-native-splash-screen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: "917951632143-k3j5bkl1k86n8sibqpcgf54v8p4bupag.apps.googleusercontent.com",
  iosClientId: "917951632143-4gfgsa42pnjt9bcepsbtetqmdc2ajkgm.apps.googleusercontent.com",
});

const App = () => {
    const [initializing, setInitializing] = useState(true);
    const [user, setUser] = useState(null);

  
    // Handle user state changes
    function onAuthStateChanged(user) {
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
    

    const scrOptions = {
        headerStyle: { backgroundColor: '#2196F3' },
        headerTintColor: '#fff',
        headerBackTitleVisible: false,
    };

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <NavigationContainer>
                <Stack.Navigator screenOptions={scrOptions}>
                    {user ? (
                        <>
                            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                            <Stack.Screen name="ChatRooms" component={ChatRooms} options={{ headerShown: true }} />
                            <Stack.Screen name="Profile" component={Profile} options={{ headerShown: true }} />
                            <Stack.Screen name="Profile Settings" component={ProfileSettings} options={{ headerShown: true }} />
                            <Stack.Screen name="Create Room" component={CreateChat} options={{ headerShown: true }} />
                            <Stack.Screen name="ChatScreen" component={ChatScreen} options={{ headerShown: true}} />
                            <Stack.Screen name="LoginMenu" component={LoginMenu} options={{ headerShown: false }} />
                        </>
                    ) : (
                        <Stack.Screen name="LoginMenu" component={LoginMenu} options={{ headerShown: false }} />
                    )}
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaView>
    );
};

export default App;