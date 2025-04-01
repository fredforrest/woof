import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const LoginMenu = () => {
  return (
    <View style={styles.container}>
      {/* App Logo */}
      <Image
        source={require('../../assets/logo.png')} // Replace with your logo path
        style={styles.logo}
      />

      {/* Facebook Login Button */}
      <TouchableOpacity style={[styles.button, styles.facebookButton]}>
        <Text style={styles.buttonText}>Login with Facebook</Text>
      </TouchableOpacity>

      {/* Google Login Button */}
      <TouchableOpacity style={[styles.button, styles.googleButton]}>
        <Text style={styles.buttonText}>Login with Google</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 150,
    height: 150,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginMenu;