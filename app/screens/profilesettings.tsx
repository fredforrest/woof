import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'react-native-image-picker';
import { updateUserAvatarInMessages, cleanupOldAvatars } from '../utils/avatarMigration';

const ProfileSettings = () => {
  const currentUser = auth().currentUser;
  const [userName, setUserName] = useState(currentUser?.displayName || '');
  const [dogType, setDogType] = useState(''); // Add state for Dog Type
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);


  
  const handleSave = async () => {
    if (!userName.trim() || !dogType.trim()) {
      Alert.alert('Error', 'Please fill out all fields.');
      return;
    }

    setLoading(true);

    try {
      const oldAvatarURL = currentUser?.photoURL;

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

      await currentUser?.reload(); // Reload user to get updated profile

      // If avatar was changed, update all existing messages and cleanup old avatars
      if (photoURL && photoURL !== oldAvatarURL) {
        // Update avatar in all existing messages (runs in background)
        updateUserAvatarInMessages(photoURL).catch(error => {
          console.error('Error updating messages with new avatar:', error);
        });

        // Clean up old avatar files (runs in background)
        if (oldAvatarURL) {
          cleanupOldAvatars(photoURL).catch(error => {
            console.error('Error cleaning up old avatars:', error);
          });
        }
      }

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle photo upload to Firebase Storage
  const handlePhotoUpload = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
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
        const localUri = selectedImage.uri;

        if (!localUri) {
          Alert.alert('Error', 'No image selected.');
          return;
        }

        setUploadingPhoto(true);

        try {
          // Create a unique filename for the avatar
          const fileName = `avatar_${currentUser.uid}_${Date.now()}.jpg`;
          const storageRef = storage().ref(`avatars/${fileName}`);

          // Upload the image to Firebase Storage
          await storageRef.putFile(localUri);

          // Get the download URL
          const downloadURL = await storageRef.getDownloadURL();

          // Update the local state with the permanent URL
          setPhotoURL(downloadURL);

          Alert.alert('Success', 'Profile photo uploaded successfully!');
        } catch (uploadError) {
          console.error('Error uploading photo to Firebase Storage:', uploadError);
          Alert.alert('Error', 'Failed to upload photo to storage.');
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (error) {
      console.error('Error with image picker:', error);
      Alert.alert('Error', 'Something went wrong while selecting the photo.');
      setUploadingPhoto(false);
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
      <TouchableOpacity 
        style={[styles.uploadButton, uploadingPhoto && styles.disabledButton]} 
        onPress={handlePhotoUpload}
        disabled={uploadingPhoto}
      >
        <Text style={styles.uploadButtonText}>
          {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
        </Text>
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
  disabledButton: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileSettings;