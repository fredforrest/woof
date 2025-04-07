import React from 'react';
import LoginMenu from './app/screens/loginmenu';
import { SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import HomeScreen from './app/screens/homescreen';
import ChatRooms from './app/screens/chatrooms';
import Profile from './app/screens/profile';
import { RootStackParamList } from './app/components/navigation/types';


const Stack = createNativeStackNavigator<RootStackParamList>();

GoogleSignin.configure({
  webClientId: "917951632143-k3j5bkl1k86n8sibqpcgf54v8p4bupag.apps.googleusercontent.com",
  iosClientId: "917951632143-4gfgsa42pnjt9bcepsbtetqmdc2ajkgm.apps.googleusercontent.com",
});


const App = () => {
    const scrOptions = {
        headerShown: false,
        headerStyle: { backgroundColor: '#f4511e' },
        headerTintColor: '#fff',
        headerBackTitleVisible: false,
    };


    return (
        <SafeAreaView style={{ flex: 1 }}>
            <NavigationContainer>
                <Stack.Navigator screenOptions={scrOptions}>
                    <Stack.Screen name="Login Menu" component={LoginMenu} />
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen name="Chat Rooms" component={ChatRooms} />
                    <Stack.Screen name="Profile" component={Profile} />
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaView>
    );
};

export default App;