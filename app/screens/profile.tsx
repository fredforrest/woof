import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../components/navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';

const Profile = () => {
    const navigation = useNavigation<RootStackNavigationProp>();
    {
        return (
    <SafeAreaView style={styles.container}>

        <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={() => navigation.navigate('Profile Settings')}>
            <Text style={styles.settingsButtonText}>Settings</Text>
        </TouchableOpacity>
        <Text style={styles.text}>Profile</Text>
    </SafeAreaView>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    settingsButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#2196F3', // Blue background for the button
        padding: 10,
        borderRadius: 5,
    },
    settingsButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Profile;