import React from 'react';
import LoginMenu from './app/screens/loginmenu';
import { SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

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