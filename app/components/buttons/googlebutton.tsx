import React from 'react';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Text, StyleSheet, TouchableOpacity, Alert, Image, View} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../navigation/types';

export default function GoogleSignIn() {
  const navigation = useNavigation<RootStackNavigationProp>();

  async function onGoogleButtonPress() {
    try {
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get the user's ID token
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token found');
      } 

      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential
      await auth().signInWithCredential(googleCredential);

      // Navigate to the Home screen after successful sign-in
      Alert.alert('Success', 'Signed in with Google!');
      navigation.navigate("Home");
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      Alert.alert('Error', 'Failed to sign in with Google.');
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