import React from 'react';
import LoginMenu from './app/screens/loginmenu';
import { SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoogleSignin } from '@react-native-google-signin/google-signin';


const Stack = createNativeStackNavigator();

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
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaView>
    );
};

export default App;