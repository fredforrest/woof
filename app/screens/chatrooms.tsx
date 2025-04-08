import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ChatRooms = () => {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            {/* Back Button */}

            <Text style={styles.text}>Chat Rooms</Text>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingTop: 50, // Add padding to avoid overlap with the back button
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
    },
});

export default ChatRooms;