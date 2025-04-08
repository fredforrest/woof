import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const ProfileSettings = () => {
  const currentUser = auth().currentUser;
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);

  // Load the current user's profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (currentUser) {
        setUserName(currentUser.displayName || ''); // Load displayName from Firebase Auth
        const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          setUserName(data?.userName || currentUser.displayName || '');
        }
      }
    };

    loadUserProfile();
  }, [currentUser]);

  const handleSave = async () => {
    if (!userName.trim()) {
      Alert.alert('Error', 'User name cannot be empty.');
      return;
    }

    setLoading(true);

    try {
      // Update Firebase Authentication profile
      await currentUser?.updateProfile({
        displayName: userName,
      });

      // Save userName to Firestore
      await firestore().collection('users').doc(currentUser?.uid).set(
        {
          userName: userName,
        },
        { merge: true } // Merge with existing data
      );

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>User Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your user name"
        value={userName}
        onChangeText={setUserName}
      />
      <Button title={loading ? 'Saving...' : 'Save'} onPress={handleSave} disabled={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
});

export default ProfileSettings;