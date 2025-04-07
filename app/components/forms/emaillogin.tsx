import React from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert, Button} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { RootStackNavigationProp } from '../navigation/types';

export const EmailLogin = () => {
    const navigation = useNavigation<RootStackNavigationProp>();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');

    const handleLogin = () => {
        auth()
            .createUserWithEmailAndPassword(email, password)
            .then(() => {
                Alert.alert('Success', 'User account created & signed in!');
                navigation.navigate("Home");
            })
            .catch(error => {
                if (error.code === 'auth/email-already-in-use') {
                    // Hvis brugeren allerede findes, så log ind i stedet
                    auth()
                        .signInWithEmailAndPassword(email, password)
                        .then(() => {
                            Alert.alert('Success', 'Logged in successfully!');
                            navigation.navigate("Home");
                        })
                        .catch(signInError => {
                            if (signInError.code === 'auth/wrong-password') {
                                Alert.alert('Error', 'Incorrect password!');
                            } else {
                                Alert.alert('Login error', signInError.message);
                            }
                        });
                } else if (error.code === 'auth/invalid-email') {
                    Alert.alert('Invalid email address');
                } else {
                    Alert.alert('Error', error.message);
                }
            });
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <View style={styles.buttonContainer}>
                {/* Login or Register Button */}
                <TouchableOpacity style={[styles.button, styles.loginButton]} onPress={handleLogin}>
                    <Text style={styles.buttonText}>Login or Register</Text>
                </TouchableOpacity>
            </View>

           
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        padding: 16,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 2,
        marginBottom: 12,
        paddingHorizontal: 8,
        borderRadius: 4,
        width: 300,
    },
    buttonContainer: {
        marginTop: 12,
    },
    button: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10, // Add spacing between buttons
    },
    loginButton: {
        backgroundColor: '#4CAF50', // Green for login or register
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EmailLogin;