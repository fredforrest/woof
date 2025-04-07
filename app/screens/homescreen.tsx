import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { RootStackNavigationProp } from '../components/navigation/types';

const HomeScreen = () => {
    const navigation = useNavigation<RootStackNavigationProp>();

    const handleLogout = async () => {
        try {
            await auth().signOut();
            Alert.alert('Success', 'You have been logged out.');
            navigation.navigate('Login Menu'); // Navigate back to the login screen
        } catch (error) {
            console.error('Logout Error:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Woof Chat!</Text>

            {/* Navigate to Profile */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Profile')}
            >
                <Text style={styles.buttonText}>Go to Profile</Text>
            </TouchableOpacity>

            {/* Navigate to Chat Rooms */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Chat Rooms')}
            >
                <Text style={styles.buttonText}>Go to Chat Rooms</Text>
            </TouchableOpacity>

            {/* Log Out Button */}
            <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
                <Text style={styles.buttonText}>Log Out</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FDFDFD',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    button: {
        backgroundColor: '#2196F3', // Blue button
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
        width: '80%',
    },
    logoutButton: {
        backgroundColor: '#FF3B30', // Red button for logout
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default HomeScreen;