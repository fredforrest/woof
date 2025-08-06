import React from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert, Button} from 'react-native';
import auth from '@react-native-firebase/auth';
import { UserService } from '../../services';

export const EmailLogin = () => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');

    // Email validation function
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Sanitize email input
    const sanitizeEmail = (email: string): string => {
        return email.trim().toLowerCase();
    };

    const handleLogin = () => {
        const sanitizedEmail = sanitizeEmail(email);
        
        // Validate email format before sending to Firebase
        if (!isValidEmail(sanitizedEmail)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Invalid Password', 'Password must be at least 6 characters long');
            return;
        }

        auth()
            .createUserWithEmailAndPassword(sanitizedEmail, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                
                // Create user document in Firestore
                try {
                    await UserService.createOrUpdateUser(user.uid, {
                        displayName: user.displayName || 'User',
                        email: user.email || '',
                        userName: user.email?.split('@')[0] || 'user',
                        dogType: '',
                        isOnline: true,
                        lastSeen: new Date().toISOString()
                    });
                } catch (error) {
                    console.error('⚠️ Failed to create user document, but auth succeeded:', error);
                }
                
                Alert.alert('Success', 'User account created & signed in!');
                // Let App.tsx handle navigation based on auth state
            })
            .catch(error => {
                if (error.code === 'auth/email-already-in-use') {
                    // If user already exists, try to sign in instead
                    auth()
                        .signInWithEmailAndPassword(sanitizedEmail, password)
                        .then(async (userCredential) => {
                            const user = userCredential.user;
                            
                            // Ensure user document exists in Firestore
                            try {
                                await UserService.createOrUpdateUser(user.uid, {
                                    displayName: user.displayName || 'User',
                                    email: user.email || sanitizedEmail,
                                    photoURL: user.photoURL || '',
                                });
                            } catch (error) {
                                console.error('⚠️ Failed to update user document, but auth succeeded:', error);
                            }
                            
                            Alert.alert('Success', 'Logged in successfully!');
                            // Let App.tsx handle navigation based on auth state
                        })
                        .catch(signInError => {
                            if (signInError.code === 'auth/wrong-password') {
                                Alert.alert('Error', 'Incorrect password!');
                            } else if (signInError.code === 'auth/invalid-email') {
                                Alert.alert('Error', 'Invalid email format. Please check your email address.');
                            } else if (signInError.code === 'auth/user-not-found') {
                                Alert.alert('Error', 'No account found with this email address.');
                            } else {
                                Alert.alert('Login error', signInError.message);
                            }
                        });
                } else if (error.code === 'auth/invalid-email') {
                    Alert.alert('Error', `Invalid email format: "${sanitizedEmail}". Please check your email address.`);
                } else if (error.code === 'auth/weak-password') {
                    Alert.alert('Error', 'Password is too weak. Please use a stronger password.');
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
                onChangeText={(text) => {
                    // Remove any leading/trailing spaces as user types
                    setEmail(text.trim());
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
            />
            <TextInput
                style={styles.input}
                placeholder="Password (min 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
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
        backgroundColor: '#2196F3', 
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EmailLogin;