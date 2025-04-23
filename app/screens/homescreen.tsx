import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { RootStackNavigationProp } from '../components/navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = () => {
    const navigation = useNavigation<RootStackNavigationProp>();
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const currentUser =auth().currentUser;
        if (currentUser) {
            setUserName(currentUser.displayName || 'DogLover69'); // Set the user name from Firebase
        }
    }, []);
    // Handle Logout
    // This function will be called when the user presses the "Log Out" button
    const handleLogout = async () => {
        try {
            await auth().signOut();
            Alert.alert('Success', 'You have been logged out.');
            navigation.navigate('LoginMenu'); // Navigate back to the login screen
        } catch (error) {
            console.error('Logout Error:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Logo/Image */}
            <Image
                source={require('../images/homelogo.jpg')}
                style={styles.logo}
            />

            {/* Title */}
            <Text style={styles.title}>Welcome to Woof Social</Text>
            
             {/* User Name with Rounded Edge */}
             <View style={styles.userNameContainer}>
                <Text style={styles.userName}>{userName}</Text>
            </View>


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
                onPress={() => navigation.navigate('ChatRooms')}
            >
                <Text style={styles.buttonText}>Go to Chat Rooms</Text>
            </TouchableOpacity>

            {/* Log Out Button */}
            <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
                <Text style={styles.buttonText}>Log Out</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start', // Move content to the top
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
    userNameContainer: {
        backgroundColor: '#E3F2FD', // Light blue background
        paddingVertical: 5,
        paddingHorizontal: 20,
        borderRadius: 20, // Rounded edges
        marginVertical: 20,
        marginBottom: 30,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2196F3',
        marginVertical: 20,
    },
    button: {
        backgroundColor: '#2196F3', // Blue button
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
        width: '80%',
        marginTop: 30,
    },
    logoutButton: {
        backgroundColor: '#FF3B30', // Red button for logout
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    logo: {
        width: 200,
        height: 200,
        marginBottom: 20,
        marginTop: 20, // Add margin to move the image down slightly from the top
    },
});

export default HomeScreen;


