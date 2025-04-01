import React from 'react';
import LoginMenu from './app/screens/loginmenu';
import { SafeAreaView } from 'react-native';


const App = () => {

    const scrOptions = {
        headerShown: false,
        headerStyle: { backgroundColor: '#f4511e' },
        headerTintColor: '#fff',
        headerBackTitleVisible: false,
    };


    return (

        <SafeAreaView>
            <NavigationContainer>
                <Stack.Navigator screenOptions={scrOptions}>
                    <Stack.Screen name="Login Menu" component={LoginMenu} />
            </NavigationContainer>
        </SafeAreaView>


    )
}