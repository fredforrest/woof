import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { RootStackNavigationProp} from '../navigation/types';

const CreateUser = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const navigation = useNavigation<RootStackNavigationProp>();

    const handleCreateUser = async () => {
        if (!email || !password || !fullName) { 
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }

        try {
            const userCredential = await auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Optionally update the user's display name
            await user.updateProfile({ displayName: fullName });

            Alert.alert('Success', 'Account created successfully!');
            navigation.navigate("Home"); // Navigate to the home screen
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'An unknown error occurred.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Account</Text>
            <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
            />
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
            <Button title="Create Account" onPress={handleCreateUser} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 15,
        paddingHorizontal: 10,
    },
});

export default CreateUser;