import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'react-native-image-picker';
import { updateUserAvatarInMessages, cleanupOldAvatars } from '../utils/avatarMigration';
import { 
  sanitizeInput, 
  validateImageFile, 
  validateFileSize, 
  getCurrentUser, 
  handleSecureError, 
  logSecurityEvent 
} from '../utils/security';

const ProfileSettings = () => {
  const currentUser = auth().currentUser;
  const [userName, setUserName] = useState(currentUser?.displayName || '');
  const [dogType, setDogType] = useState(''); // Add state for Dog Type
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);


  
  const handleSave = async () => {
    try {
      const user = getCurrentUser();
      
      // Security: Validate and sanitize inputs
      const sanitizedUserName = sanitizeInput(userName);
      const sanitizedDogType = sanitizeInput(dogType);
      
      if (!sanitizedUserName.trim() || sanitizedUserName.length > 50) {
        Alert.alert('Error', 'Please enter a valid name (1-50 characters).');
        return;
      }
      
      if (!sanitizedDogType.trim() || sanitizedDogType.length > 30) {
        Alert.alert('Error', 'Please enter a valid dog type (1-30 characters).');
        return;
      }

      setLoading(true);

      const oldAvatarURL = user.photoURL;

      // Update Firebase Authentication profile
      await user.updateProfile({
        displayName: sanitizedUserName,
        photoURL: photoURL,
      });

      // Save userName and dogType to Firestore
      await firestore().collection('users').doc(user.uid).set(
        {
          userName: sanitizedUserName,
          dogType: sanitizedDogType,
          photoURL: photoURL,
        },
        { merge: true } // Merge with existing data
      );

      await user.reload(); // Reload user to get updated profile

      // Log security event
      await logSecurityEvent('profile_updated', { 
        hasAvatarChange: photoURL !== oldAvatarURL,
        userNameLength: sanitizedUserName.length,
        dogTypeLength: sanitizedDogType.length
      });

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
      handleSecureError(error, 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle photo upload to Firebase Storage
  const handlePhotoUpload = async () => {
    try {
      const user = getCurrentUser();
      
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
        handleSecureError(result.errorCode, 'Failed to pick an image.');
        return;
      }
  
      if (result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        const localUri = selectedImage.uri;

        if (!localUri) {
          Alert.alert('Error', 'No image selected.');
          return;
        }

        // Security: Validate image file
        const isValidImage = await validateImageFile(localUri);
        const isValidSize = await validateFileSize(localUri, 5); // 5MB limit

        if (!isValidImage) {
          Alert.alert('Invalid File', 'Please select a valid image (max 1024x1024px).');
          return;
        }

        if (!isValidSize) {
          Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
          return;
        }

        setUploadingPhoto(true);

        try {
          // Create a unique filename for the avatar
          const fileName = `avatar_${user.uid}_${Date.now()}.jpg`;
          const storageRef = storage().ref(`avatars/${fileName}`);

          // Upload the image to Firebase Storage
          await storageRef.putFile(localUri);

          // Get the download URL
          const downloadURL = await storageRef.getDownloadURL();

          // Update the local state with the permanent URL
          setPhotoURL(downloadURL);

          // Log security event
          await logSecurityEvent('avatar_uploaded', { fileName });

          Alert.alert('Success', 'Profile photo uploaded successfully!');
        } catch (uploadError) {
          console.error('Error uploading photo to Firebase Storage:', uploadError);
          handleSecureError(uploadError, 'Failed to upload photo.');
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (error) {
      console.error('Error in photo upload process:', error);
      handleSecureError(error, 'Failed to upload photo.');
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
          onChangeText={(text) => setUserName(sanitizeInput(text))}
          maxLength={50}
        />

        <Text style={styles.label}>Dog Type</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your dog's breed or type"
          value={dogType}
          onChangeText={(text) => setDogType(sanitizeInput(text))}
          maxLength={30}
        />      <Button title={loading ? 'Saving...' : 'Save'} onPress={handleSave} disabled={loading} />
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