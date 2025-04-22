import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as ImagePicker from 'react-native-image-picker';

const ProfileSettings = () => {
  const currentUser = auth().currentUser;
  const [userName, setUserName] = useState(currentUser?.displayName || '');
  const [dogType, setDogType] = useState(''); // Add state for Dog Type
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!userName.trim() || !dogType.trim()) {
      Alert.alert('Error', 'Please fill out all fields.');
      return;
    }

    setLoading(true);

    try {
      // Update Firebase Authentication profile
      await currentUser?.updateProfile({
        displayName: userName,
        photoURL: photoURL,
      });

      // Save userName and dogType to Firestore
      await firestore().collection('users').doc(currentUser?.uid).set(
        {
          userName: userName,
          dogType: dogType,
          photoURL: photoURL,
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

  const handlePhotoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
      });
  
      if (result.didCancel) {
        console.log('User cancelled image picker');
        return;
      }
  
      if (result.errorCode) {
        console.error('ImagePicker Error:', result.errorMessage);
        Alert.alert('Error', 'Failed to pick an image.');
        return;
      }
  
      if (result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setPhotoURL(selectedImage.uri || '');
        Alert.alert('Success', 'Photo uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Something went wrong while uploading the photo.');
    }
  };

  return (
    
    <View style={styles.container}>
      <Text style={styles.label}>Profile Picture</Text>
      {photoURL ? (
        <Image source={{ uri: photoURL }} style={styles.profileImage} />
      ) : (
        <Text style={styles.noImageText}>No Profile Picture</Text>
      )}
      <TouchableOpacity style={styles.uploadButton} onPress={handlePhotoUpload}>
        <Text style={styles.uploadButtonText}>Upload Photo</Text>
      </TouchableOpacity>

      <Text style={styles.label}>User Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your user name"
        value={userName}
        onChangeText={setUserName}
      />

      <Text style={styles.label}>Dog Type</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your dog's type"
        value={dogType}
        onChangeText={setDogType}
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
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  noImageText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  uploadButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileSettings;