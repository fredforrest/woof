import React, {useEffect, useState} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../components/navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';


const Profile = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const currentUser = auth().currentUser;
  const userName = currentUser?.displayName || 'User';
  const userEmail = currentUser?.email || 'Email not available';
  const photoURL = currentUser?.photoURL;
  const [dogType, setDogType] = useState('');

  // Fetch dogType from Firestore
  useEffect(() => {
    const fetchDogType = async () => {
      try {
        const userDoc = await firestore().collection('users').doc(currentUser?.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          setDogType(userData?.dogType || 'Alien'); // Set dogType from Firestore
        }
      } catch (error) {
        console.error('Error fetching dogType:', error);
      }
    };

    fetchDogType();
  }, [currentUser]);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Profile Settings')}
      >
        <Text style={styles.settingsButtonText}>Settings</Text>
      </TouchableOpacity>

      {/* Display Profile Picture */}
      {photoURL ? (
        <Image source={{ uri: photoURL }} style={styles.profileImage} />
      ) : (
        <Text style={styles.noImageText}>No Profile Picture</Text>
      )}

      {/* User Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Username: {userName}</Text>
        <Text style={styles.infoText}>Email: {userEmail}</Text>
        <Text style={styles.infoText}>Dog Type: {dogType}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start', // Align content to the top
    alignItems: 'center',
    paddingTop: 40, // Add padding to move content down slightly from the top
    backgroundColor: '#fff', // Optional: Add a background color for better visibility
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50, // Make the image circular
    marginBottom: 20,
  },
  noImageText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  infoBox: {
    width: '90%',
    backgroundColor: '#F5F5F5', // Light gray background
    borderRadius: 10, // Rounded corners
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // Shadow for Android
    marginTop: 20,
  },
  infoText: {
    fontSize: 20,
    marginBottom: 10,
    color: '#black', // Dark blue color
    fontWeight: '500',
  },
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
  },
  settingsButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Profile;