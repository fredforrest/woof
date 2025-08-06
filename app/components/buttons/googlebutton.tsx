import React from 'react';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Text, StyleSheet, TouchableOpacity, Alert, Image, View} from 'react-native';
import { UserService } from '../../services';

export default function GoogleSignIn() {
  async function onGoogleButtonPress() {
    try {
      console.log('Starting Google Sign-In process...');
      
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get the user's ID token
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token found');
      } 

      console.log('ID token received, creating Firebase credential...');

      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential
      const userCredential = await auth().signInWithCredential(googleCredential);
      const user = userCredential.user;

      console.log('Firebase authentication successful');

      // Create or update user document using service layer
      if (user) {
        console.log('Creating/updating user document...');
        
        await UserService.createOrUpdateUser(user.uid, {
          userName: user.displayName || 'User',
          displayName: user.displayName || 'User',
          email: user.email || '',
          photoURL: user.photoURL || '',
          dogType: 'Unknown'
        });
        
        console.log('User document updated successfully');
      }

      // Don't navigate manually - let App.tsx handle navigation based on auth state
      console.log('🎉 Google Sign-In completed successfully!');
      Alert.alert('Success', 'Signed in with Google!');
      
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      console.error('Error Code:', error.code);
      console.error('Error Message:', error.message);
      
      // Handle user cancellation gracefully
      if (error.code === '12501') {
        console.log('ℹ️ User cancelled Google Sign-In');
        return; // Don't show error for cancellation
      }
      
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    }
  }

  return (
    <TouchableOpacity style={styles.button} onPress={onGoogleButtonPress}>
      <View style={styles.logoContainer}>
      <Image source={require('../../images/google-logo.png')} style={styles.image} />
     </View>      
     <Text style={styles.text}>Sign in with Google</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '80%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DB4437', // Google red
    marginVertical: 10,
  },
  text: {
    color: '#FFFFFF', // White text
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16, // Circular background
    backgroundColor: '#FFFFFF', // White background
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10, // Spacing between the logo and text
  },
  image: {
    width: 20, // Adjust the size of the Google "G" image
    height: 20,
  },
});