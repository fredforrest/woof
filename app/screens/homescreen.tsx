import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { RootStackNavigationProp } from '../components/navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = () => {
    const navigation = useNavigation<RootStackNavigationProp>();
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const currentUser = auth().currentUser;
        if (currentUser) {
            setUserName(currentUser.displayName || 'DogLover69');
        }
    }, []);

    const handleLogout = async () => {
        try {
            await auth().signOut();
            Alert.alert('Success', 'You have been logged out.');
            navigation.navigate('LoginMenu');
        } catch (error) {
            console.error('Logout Error:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Image source={require('../images/wooflogo.jpg')} style={styles.logo} />

                <Text style={styles.title}>Welcome, {userName}</Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Text style={styles.buttonText}>Go to Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('ChatRooms')}
                >
                    <Text style={styles.buttonText}>Go to Chat Rooms</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
                    <Text style={styles.buttonText}>Log Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFDFD',
    },
    scrollContent: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    userNameContainer: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginBottom: 30,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 8,
        marginBottom: 25,
        width: '80%',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        marginTop: 20,
    },
    logo: {
        width: 300,
        height: 300,
        borderRadius: 20,
        marginBottom: 20,
        resizeMode: 'contain',
    },
});

export default HomeScreen;
