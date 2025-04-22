import React from 'react';
import { StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoogleButton from '../components/buttons/googlebutton';
import Separator from '../components/ui/separator';
import EmailLogin from '../components/forms/emaillogin';

const LoginMenu = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('../images/wooflogo.jpg')}
        style={styles.logo}
      />
      
      <EmailLogin />

      <Separator text="Or"/>

      <GoogleButton />
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
    marginBottom: 20, // Reduced spacing below the logo
  },
  separator: {
    marginVertical: 8, // Reduced spacing for the separator
  },
});

export default LoginMenu;