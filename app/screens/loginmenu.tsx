import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoogleButton from '../components/buttons/googlebutton';

const LoginMenu = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('../images/wooflogo.jpg')}
        style={styles.logo}
      />

      {/* Facebook Login Button */}
      <TouchableOpacity style={[styles.button, styles.facebookButton]}>
        <Text style={styles.buttonText}>Login with Facebook</Text>
      </TouchableOpacity>

      {/* Google Login Button */}
      <GoogleButton/>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDFDFD',
  },
  logo: {
    width: 300,
    height: 300,
    marginBottom: 40,
  },
  button: {
    width: '80%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  facebookButton: {
    backgroundColor: '#1877F2', // Facebook blue
  },
  googleButton: {
    backgroundColor: '#DB4437', // Google red
  },
  buttonText: {
    color: '#fff', // White text
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginMenu;