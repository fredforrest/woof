import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../components/navigation/types';

const ProfileSettings = () => {
    const navigation = useNavigation<RootStackNavigationProp>();
    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.text}>Profile Settings</Text>
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FDFDFD',
    },

    text: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
    },



});
export default ProfileSettings